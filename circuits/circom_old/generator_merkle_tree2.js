const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const circomlibjs = require('circomlibjs');
let hashes, poseidonReady = false;

// Cria as funções hash usando o módulo local do circomlibjs
async function initializeHashes() {
    try {
        // Importa diretamente do node_modules local
        const getHashes = (await import('./node_modules/circomlibjs/src/smt_hashes_poseidon.js')).default;
        hashes = await getHashes();
        poseidonReady = true;

        if (require.main === module) {
            main().catch(console.error);
        }
    } catch (error) {
        console.error('Erro ao inicializar hashes:', error);
        process.exit(1);
    }
}

initializeHashes();

class SparseMerkleTree {
    constructor(levels) {
        this.levels = levels;
        this.nodes = new Map();
        this.root = 0n;
        this.EMPTY_NODE_HASH = 0n;
    }

    // SMTHash1: usa hash1 do circomlibjs
    calculateLeafHash(key, value) {
        if (!poseidonReady) throw new Error('Poseidon not ready');
        return BigInt(hashes.F.toString(hashes.hash1(key, value)));
    }

    // SMTHash2: usa hash0 do circomlibjs
    hashNode(left, right) {
        if (!poseidonReady) throw new Error('Poseidon not ready');
        return BigInt(hashes.F.toString(hashes.hash0(left, right)));
    }

    // Insere um par key-value na SMT
    insert(key, value) {
        const keyBigInt = BigInt(key);
        const valueBigInt = BigInt(value);
        const leafHash = this.calculateLeafHash(keyBigInt, valueBigInt);
        if(keyBigInt == 1390849295786071768276380950238675083608645509734n){
            console.log(`MACACO\n\nLeaf hash for key ${key} and value ${value}: ${leafHash.toString()}\n\n`);
        }
        this.root = this.insertRecursive(this.root, keyBigInt, leafHash, this.levels);
        if(keyBigInt == 1390849295786071768276380950238675083608645509734n){
            console.log("\n\nMACACO FINAL")
        }
    }

    insertRecursive(nodeHash, key, leafHash, level) {
        if (level === 0) {
            return leafHash;
        }

        const bitIndex = this.levels - level; // 0-indexed bit for the current level
        const goRight = ((key >> BigInt(bitIndex)) & 1n) === 1n;


        let node = { left: this.EMPTY_NODE_HASH, right: this.EMPTY_NODE_HASH };
        if (nodeHash !== this.EMPTY_NODE_HASH && this.nodes.has(nodeHash.toString())) {
            node = this.nodes.get(nodeHash.toString());
        }

        if (goRight) {
            node.right = this.insertRecursive(node.right, key, leafHash, level - 1);
        } else {
            node.left = this.insertRecursive(node.left, key, leafHash, level - 1);
        }
        if(key == 1390849295786071768276380950238675083608645509734n){
            console.log(`Inserting at level ${level}, bitIndex ${bitIndex}, goRight: ${goRight}`,"node at level ", level, ":", node);
        }
        const newNodeHash = this.hashNode(node.left, node.right);
        this.nodes.set(newNodeHash.toString(), node);

        return newNodeHash;
    }

    // Gera prova de inclusão para uma chave (LSB-first)
    generateInclusionProof(key) {
        const proof = [];
        const keyBigInt = BigInt(key);

        // CRITICAL FIX: Generate proof LSB-first to match circuit expectations
        // proof[0] = sibling for bit 0 (LSB), proof[1] = sibling for bit 1, etc.
        for (let bitIndex = 0; bitIndex < this.levels; bitIndex++) {
            const goRight = ((keyBigInt >> BigInt(bitIndex)) & 1n) === 1n;

            // Navega pela árvore para encontrar o sibling no nível correspondente ao bitIndex
            let currentHash = this.root;
            let currentNode = null;

            // Caminha pela árvore para encontrar o nó que contém o sibling para este nível
            // Começa do nível 'levels' e desce até o nível logo acima onde o sibling é necessário
            for (let level = this.levels; level > bitIndex + 1; level--) {
                const currentBitIndex = this.levels - level; // Bit index para navegação atual
                const goRightAtThisLevel = ((keyBigInt >> BigInt(currentBitIndex)) & 1n) === 1n;

                if (currentHash === this.EMPTY_NODE_HASH) {
                    break; // Se o nó atual for vazio, não podemos continuar
                }

                const node = this.nodes.get(currentHash.toString());
                if (!node) { // Nó não encontrado, algo está errado
                    currentHash = this.EMPTY_NODE_HASH;
                    break;
                }

                currentHash = goRightAtThisLevel ? node.right : node.left;
            }

            // Agora, 'currentHash' é o hash do nó no nível onde precisamos extrair o sibling para 'bitIndex'
            if (currentHash === this.EMPTY_NODE_HASH) {
                proof.push(this.EMPTY_NODE_HASH);
            } else {
                const node = this.nodes.get(currentHash.toString());
                if (!node) {
                    proof.push(this.EMPTY_NODE_HASH);
                } else {
                    // O sibling é o oposto do caminho que tomamos neste nível
                    const sibling = goRight ? node.left : node.right;
                    proof.push(sibling);
                }
            }
        }
        return proof;
    }


    // Verifica uma prova de inclusão
    verifyInclusionProof(key, value, proof, expectedRoot) {
        const keyBigInt = BigInt(key);
        const valueBigInt = BigInt(value);
        let computedHash = this.calculateLeafHash(keyBigInt, valueBigInt);

        // CRITICAL FIX: Verify proof LSB-first to match circuit logic
        for (let i = 0; i < proof.length; i++) {
            const bitIndex = i; // LSB-first: proof[0] for bit 0, proof[1] for bit 1, etc.
            const goRight = ((keyBigInt >> BigInt(bitIndex)) & 1n) === 1n;
            const sibling = proof[i];

            if (goRight) {
                // If bit is 1, we went right, so sibling is on the left
                computedHash = this.hashNode(sibling, computedHash);
            } else {
                // If bit is 0, we went left, so sibling is on the right
                computedHash = this.hashNode(computedHash, sibling);
            }
        }

        return computedHash === expectedRoot;
    }

    // Debug function to print tree structure
    printTree() {
        console.log('Tree structure:');
        console.log('Root:', this.root.toString());
        console.log('Nodes:', this.nodes.size);

        // Print some nodes for debugging
        let count = 0;
        for (let [hash, node] of this.nodes) {
            if (count < 5) {
                console.log(`Node ${hash}: left=${node.left.toString()}, right=${node.right.toString()}`);
                count++;
            }
        }
    }
}

// Função para ler e processar CSV
function parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    const data = [];

    // Pula o header (primeira linha)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;

        const fields = line.split(',').map(field => field.trim());
        if (fields.length < 2) continue;

        const address = fields[0];
        const amount = fields[1];

        data.push({
            address: address,
            amount: BigInt(amount)
        });
    }

    return data;
}

// Converte endereço Ethereum para BigInt
function addressToBigInt(address) {
    // Remove '0x' se presente
    const cleanAddress = address.toLowerCase().replace('0x', '');
    return BigInt('0x' + cleanAddress);
}

// Gera nullifier para um usuário (simulação)
function generateNullifier(address, secret = "secret") {
    const hash = crypto.createHash('sha256');
    hash.update(address + secret);
    const result = hash.digest('hex');
    return BigInt('0x' + result.slice(0, 62)); // Trunca para field element
}

// Gera nullifier hash usando hash0 do circomlibjs (Poseidon com 2 inputs)
function generateNullifierHash(address, nullifier) {
    if (!poseidonReady) throw new Error('Poseidon not ready');
    const key = addressToBigInt(address);
    // Usa hash0 para 2 inputs: Poseidon([userAddress, nullifier])
    return BigInt(hashes.F.toString(hashes.hash0(key, nullifier)));
}

// Debug function to convert number to binary representation
function toBinary(num, bits) {
    return num.toString(2).padStart(bits, '0');
}

async function main() {
    console.log('\n--- Sparse Merkle Tree Generator para Circom (LSB-first) ---');

    // Configuração
    const TREE_LEVELS = 5; // Este valor é importante e deve corresponder ao circuito Circom
    const CSV_PATH = '../../data/addresses.csv'; // Ajustado para o caminho correto
    const OUTPUT_DIR = '../../out';

    // Cria diretório de saída se não existir
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log('Níveis da árvore:', TREE_LEVELS);

    // Lê e processa CSV
    console.log('Lendo CSV:', CSV_PATH);

    let csvContent;
    try {
        csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    } catch (error) {
        console.error('ERRO: Arquivo CSV não encontrado:', CSV_PATH);
        console.error('Por favor, crie o arquivo CSV com o formato:');
        console.error('address,amount');
        console.error('0x1234567890123456789012345678901234567890,1000');
        console.error('0x2345678901234567890123456789012345678901,2000');
        process.exit(1);
    }

    const leafData = parseCSV(csvContent);
    console.log('Dados processados:', leafData.length, 'entradas');

    // Inicializa SMT
    const smt = new SparseMerkleTree(TREE_LEVELS);

    console.log('\n--- Inserindo dados na SMT ---');

    // Insere todos os dados na SMT
    for (let i = 0; i < leafData.length; i++) {
        const key = addressToBigInt(leafData[i].address);
        const value = leafData[i].amount;

        console.log(`Inserindo ${i}: address=${leafData[i].address}, key=${key.toString()}, value=${value.toString()}`);
        console.log(`  Key binary (${TREE_LEVELS} bits): ${toBinary(key, TREE_LEVELS)}`);

        smt.insert(key, value);

        if (i < 3) {
            console.log(`Inserido: ${leafData[i].address} -> ${value}`);
            console.log(`  Root após inserção: ${smt.root.toString()}`);
        } else if (i === 3) {
            console.log(`... e mais ${leafData.length - 3} entradas`);
        }
    }

    console.log('\n--- Raiz da SMT ---');
    console.log('Root:', smt.root.toString());

    // Debug tree structure
    smt.printTree();

    console.log('\n--- Gerando provas de inclusão e nullifiers ---');

    const results = {
        smtRoot: smt.root.toString(),
        treeLevels: TREE_LEVELS,
        hashFunction: "Poseidon",
        treeType: "Sparse Merkle Tree",
        totalAmount: leafData.reduce((sum, leaf) => sum + leaf.amount, 0n).toString(),
        leaves: []
    };

    const circomInputs = [];

    for (let i = 0; i < leafData.length; i++) {
        const address = leafData[i].address;
        const amount = leafData[i].amount;
        const key = addressToBigInt(address);

        // Gera nullifier
        const nullifier = generateNullifier(address, `secret_${i}`);

        // Calcula nullifier hash usando Poseidon(userAddress, nullifier)
        const nullifierHash = generateNullifierHash(address, nullifier);

        // Gera prova de inclusão
        const proof = smt.generateInclusionProof(key); // Agora retorna prova LSB-first

        // Verifica a prova
        const isValid = smt.verifyInclusionProof(key, amount, proof, smt.root);

        // Calcula leaf hash
        const leafHash = smt.calculateLeafHash(key, amount);

        console.log(`\n--- Debug para entrada ${i} ---`);
        console.log(`Address: ${address}`);
        console.log(`Key: ${key.toString()}`);
        console.log(`Key binary: ${toBinary(key, TREE_LEVELS)}`); // Mostra os 5 bits LSB-first
        console.log(`Amount: ${amount.toString()}`);
        console.log(`Leaf hash: ${leafHash.toString()}`);
        console.log(`Proof: [${proof.map(p => p.toString()).join(', ')}]`);
        console.log(`Proof valid: ${isValid}`);

        // Adiciona aos resultados
        results.leaves.push({
            key: address,
            keyUint: key.toString(),
            keyBinary: toBinary(key, TREE_LEVELS),
            value: amount.toString(),
            leafHash: leafHash.toString(),
            nullifier: nullifier.toString(),
            nullifierHash: nullifierHash.toString(),
            siblings: proof.map(p => p.toString()),
            isValid: isValid
        });

        // Prepara input para Circom
        circomInputs.push({
            merkleRoot: smt.root.toString(),
            nullifierHash: nullifierHash.toString(),
            userAddress: key.toString(),
            amount: amount.toString(),
            nullifier: nullifier.toString(),
            siblings: proof.map(p => p.toString()) // Usa prova LSB-first diretamente
        });

        if (i < 3) {
            console.log(`Prova para ${address} (amount: ${amount}) válida: ${isValid}`);
            console.log(`  Nullifier: ${nullifier.toString()}`);
            console.log(`  NullifierHash: ${nullifierHash.toString()}`);
        } else if (i === 3) {
            console.log(`... e mais ${leafData.length - 3} provas geradas`);
        }
    }

    // Escreve resultados nos arquivos
    const resultsPath = path.join(OUTPUT_DIR, 'smt_results_fixed.json');
    const circomInputsPath = path.join(OUTPUT_DIR, 'inputs_circom_fixed.json');

    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    fs.writeFileSync(circomInputsPath, JSON.stringify(circomInputs, null, 2));

    console.log('\n--- Resultados salvos ---');
    console.log('SMT Results:', resultsPath);
    console.log('Circom Inputs:', circomInputsPath);

    // Mostra exemplo de como usar com seu circuito
    console.log('\n--- Exemplo de uso com Circom ---');
    console.log('Para testar seu circuito, use o primeiro input:');
    console.log(JSON.stringify(circomInputs[0], null, 2));

    return {
        root: smt.root.toString(),
        inputs: circomInputs,
        results: results
    };
}

module.exports = { SparseMerkleTree, main };