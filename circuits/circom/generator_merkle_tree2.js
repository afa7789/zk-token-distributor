const fs = require('fs');
const path = require('path');
const crypto = require('crypto');


const circomlibjs = require('circomlibjs');
let poseidon, smtHash1, smtHash2, poseidonReady = false;

(async () => {
    poseidon = await circomlibjs.buildPoseidon();
    smtHash1 = circomlibjs.smtHash1(poseidon);
    smtHash2 = circomlibjs.smtHash2(poseidon);
    poseidonReady = true;
    if (require.main === module) {
        main().catch(console.error);
    }
})();

class SparseMerkleTree {
    constructor(levels) {
        this.levels = levels;
        this.nodes = new Map();
        this.root = 0n;
        this.EMPTY_NODE_HASH = 0n;
    }

    // SMTHash1: usa circomlibjs.smtHash1
    calculateLeafHash(key, value) {
        if (!poseidonReady) throw new Error('Poseidon not ready');
        return smtHash1(key, value);
    }

    // SMTHash2: usa circomlibjs.smtHash2
    hashNode(left, right) {
        if (!poseidonReady) throw new Error('Poseidon not ready');
        return smtHash2(left, right);
    }

    // Insere um par key-value na SMT
    insert(key, value) {
        const keyBigInt = BigInt(key);
        const valueBigInt = BigInt(value);
        const leafHash = this.calculateLeafHash(keyBigInt, valueBigInt);
        
        this.root = this.insertRecursive(this.root, keyBigInt, leafHash, this.levels);
    }

    insertRecursive(nodeHash, key, leafHash, level) {
        if (level === 0) {
            return leafHash;
        }

        // FIXED: Usa LSB first (bit 0 = LSB) para compatibilidade com Circom
        const bitIndex = this.levels - level; // Para 5 níveis: level 5->bit 0, level 4->bit 1, etc.
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

        const newNodeHash = this.hashNode(node.left, node.right);
        this.nodes.set(newNodeHash.toString(), node);

        return newNodeHash;
    }

    // Gera prova de inclusão para uma chave
    generateInclusionProof(key) {
        const proof = [];
        const keyBigInt = BigInt(key);
        let currentHash = this.root;

        for (let i = 0; i < this.levels; i++) {
            // FIXED: Usa LSB first para compatibilidade com Circom
            // bitIndex = i -> depth 0 uses bit 0 (LSB), depth 1 uses bit 1, etc.
            const bitIndex = i;
            const goRight = ((keyBigInt >> BigInt(bitIndex)) & 1n) === 1n;

            if (currentHash === this.EMPTY_NODE_HASH) {
                proof.push(this.EMPTY_NODE_HASH);
            } else {
                const node = this.nodes.get(currentHash.toString());
                if (!node) {
                    proof.push(this.EMPTY_NODE_HASH);
                    currentHash = this.EMPTY_NODE_HASH;
                } else {
                    if (goRight) {
                        proof.push(node.left);
                        currentHash = node.right;
                    } else {
                        proof.push(node.right);
                        currentHash = node.left;
                    }
                }
            }
        }

        // FIXED: Remove a inversão - agora os siblings já estão na ordem correta
        return proof;
    }

    // Verifica uma prova de inclusão
    verifyInclusionProof(key, value, proof, expectedRoot) {
        const keyBigInt = BigInt(key);
        const valueBigInt = BigInt(value);
        let computedHash = this.calculateLeafHash(keyBigInt, valueBigInt);

        for (let i = 0; i < proof.length; i++) {
            // FIXED: Usa LSB first
            // Use same indexing as insertRecursive (depth i -> bit i)
            const bitIndex = i;
            const goRight = ((keyBigInt >> BigInt(bitIndex)) & 1n) === 1n;

            if (goRight) {
                computedHash = this.hashNode(proof[i], computedHash);
            } else {
                computedHash = this.hashNode(computedHash, proof[i]);
            }
        }

        return computedHash === expectedRoot;
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

// Gera nullifier hash usando Poseidon(userAddress, nullifier) (compatível com Circom)
function generateNullifierHash(address, nullifier) {
    if (!poseidonReady) throw new Error('Poseidon not ready');
    const key = addressToBigInt(address);
    // Poseidon([userAddress, nullifier])
    return BigInt(poseidon.F.toString(poseidon([key, nullifier])));
}

async function main() {
    console.log('\n--- Sparse Merkle Tree Generator para Circom (FIXED LSB-first) ---');
    
    // Configuração
    const TREE_LEVELS = 5;
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
        
        smt.insert(key, value);
        
        if (i < 3) {
            console.log(`Inserido: ${leafData[i].address} -> ${value}`);
        } else if (i === 3) {
            console.log(`... e mais ${leafData.length - 3} entradas`);
        }
    }
    
    console.log('\n--- Raiz da SMT ---');
    console.log('Root:', smt.root.toString());
    
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
        const proof = smt.generateInclusionProof(key);
        
        // Verifica a prova
        const isValid = smt.verifyInclusionProof(key, amount, proof, smt.root);
        
        // Calcula leaf hash
        const leafHash = smt.calculateLeafHash(key, amount);
        
        // Adiciona aos resultados
        results.leaves.push({
            key: address,
            keyUint: key.toString(),
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
            siblings: proof.map(p => p.toString())
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

// Executa se for chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { SparseMerkleTree, main };