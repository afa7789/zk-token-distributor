const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Usa poseidon-lite que exporta funções separadas por aridade
let poseidon2;
let poseidon3;
try {
    const poseidonLite = require('poseidon-lite');
    poseidon2 = poseidonLite.poseidon2;
    poseidon3 = poseidonLite.poseidon3;
} catch (e) {
    console.error('Erro: poseidon-lite não encontrado.');
    console.error('Instale com: npm install poseidon-lite');
    process.exit(1);
}

class SparseMerkleTree {
    constructor(levels) {
        this.levels = levels;
        this.nodes = new Map();
        this.root = 0n;
        this.EMPTY_NODE_HASH = 0n;
    }

    // SMTHash1: Poseidon(key, value, 1) - para leaf hash
    calculateLeafHash(key, value) {
        return poseidon3([key.toString(), value.toString(), '1']);
    }

    // SMTHash2: Poseidon(left, right, 0) - para internal node hash
    hashNode(left, right) {
        return poseidon3([left.toString(), right.toString(), '0']);
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

        // Obtém o bit neste nível (MSB primeiro)
        const bitIndex = level - 1;
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
            const bitIndex = this.levels - 1 - i;
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

        return proof;
    }

    // Verifica uma prova de inclusão
    verifyInclusionProof(key, value, proof, expectedRoot) {
        const keyBigInt = BigInt(key);
        const valueBigInt = BigInt(value);
        let computedHash = this.calculateLeafHash(keyBigInt, valueBigInt);

        for (let i = 0; i < proof.length; i++) {
            const bitIndex = this.levels - 1 - i;
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

// Gera nullifier hash usando Poseidon(userAddress, nullifier)
function generateNullifierHash(address, nullifier) {
    const key = addressToBigInt(address);
    return poseidon2([key.toString(), nullifier.toString()]);
}

async function main() {
    console.log('\n--- Sparse Merkle Tree Generator para Circom ---');
    
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
    const resultsPath = path.join(OUTPUT_DIR, 'smt_results_2.json');
    const circomInputsPath = path.join(OUTPUT_DIR, 'inputs_circom_2.json');
    
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