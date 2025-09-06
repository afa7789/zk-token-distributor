const { newMemEmptyTrie, buildPoseidon } = require('circomlibjs');
const crypto = require('crypto');

// Import the actual MerkleTree class - we'll create a wrapper
// Since merkle_tree.js uses ES6 modules, we'll need a different approach
async function importMerkleTree() {
    try {
        // Try to import the actual MerkleTree
        const { MerkleTree } = await import('./merkle_tree.js');
        return MerkleTree;
    } catch (error) {
        console.log('Could not import ES6 MerkleTree, using fallback implementation');
        return null;
    }
}

// Fallback MerkleTree implementation using CommonJS and circomlibjs
class FallbackMerkleTree {
    constructor(levels, elements = []) {
        this.levels = levels;
        this.capacity = 2 ** levels;
        this._layers = [];
        this._zeros = [];
        
        // Initialize with empty poseidon for now
        this.poseidon = null;
        this.elements = elements;
    }

    async init() {
        this.poseidon = await buildPoseidon();
        
        // Calculate zeros using same default as original
        this._zeros[0] = BigInt('21663839004416932945382355908790599225266501822907911457504978515578255421292');
        for (let i = 1; i <= this.levels; i++) {
            this._zeros[i] = BigInt(this.poseidon.F.toString(this.poseidon([this._zeros[i - 1], this._zeros[i - 1]])));
        }

        // Build tree
        this._layers[0] = this.elements.map(e => BigInt(e));
        this._rebuild();
    }

    _hash(left, right) {
        return BigInt(this.poseidon.F.toString(this.poseidon([left, right])));
    }

    _rebuild() {
        for (let level = 1; level <= this.levels; level++) {
            this._layers[level] = [];
            
            for (let i = 0; i < Math.ceil(this._layers[level - 1].length / 2); i++) {
                const leftChild = this._layers[level - 1][i * 2];
                const rightChild = i * 2 + 1 < this._layers[level - 1].length
                    ? this._layers[level - 1][i * 2 + 1]
                    : this._zeros[level - 1];
                
                this._layers[level][i] = this._hash(leftChild, rightChild);
            }
        }
    }

    root() {
        return this._layers[this.levels].length > 0
            ? this._layers[this.levels][0]
            : this._zeros[this.levels];
    }

    path(index) {
        if (index < 0 || index >= this._layers[0].length) {
            throw new Error('Index out of bounds: ' + index);
        }

        const pathElements = [];
        const pathIndices = [];

        for (let level = 0; level < this.levels; level++) {
            pathIndices[level] = index % 2;
            pathElements[level] = (index ^ 1) < this._layers[level].length
                ? this._layers[level][index ^ 1]
                : this._zeros[level];
            index >>= 1;
        }

        return {
            pathElements,
            pathIndices,
        };
    }

    insert(element) {
        if (this._layers[0].length >= this.capacity) {
            throw new Error('Tree is full');
        }
        this._layers[0].push(BigInt(element));
        this._rebuild();
    }
}

// Helper functions
function addressToBigInt(address) {
    const cleanAddress = address.toLowerCase().replace('0x', '');
    return BigInt('0x' + cleanAddress);
}

function generateNullifier(address, secret = "secret") {
    const hash = crypto.createHash('sha256');
    hash.update(address + secret);
    const result = hash.digest('hex');
    return BigInt('0x' + result.slice(0, 62));
}

async function testMerkleTreeComparison() {
    console.log('\n=== MERKLE TREE COMPARISON TEST ===\n');

    const TREE_LEVELS = 5;
    
    // Test data - same as your input.json
    const testAddress = '0x0000000000000000000000000000000000000000000000000000000000000001'; // Simplified for testing
    const testAmount = '60000000000000000000000';
    
    console.log('Test Parameters:');
    console.log('Address:', testAddress);
    console.log('Amount:', testAmount);
    console.log('Tree Levels:', TREE_LEVELS);
    console.log();

    // === TEST 1: Simple MerkleTree ===
    console.log('=== TEST 1: Simple MerkleTree Implementation ===');
    
    const poseidon = await buildPoseidon();
    const key = addressToBigInt(testAddress);
    const amount = BigInt(testAmount);
    
    console.log('Key (address as BigInt):', key.toString());
    console.log('Amount:', amount.toString());
    
    // Create leaf hash like SMT does
    const leafHash = BigInt(poseidon.F.toString(poseidon([key, amount])));
    console.log('Leaf Hash (SMTHash1-style):', leafHash.toString());
    
    const MerkleTree = new MerkleTree(TREE_LEVELS, [leafHash]);
    await MerkleTree.init();
    
    const simpleRoot = MerkleTree.root();
    console.log('Simple MerkleTree Root:', simpleRoot.toString());
    
    const simplePath = MerkleTree.path(0);
    console.log('Simple MerkleTree Siblings:', simplePath.pathElements.map(e => e.toString()));
    console.log();

    // === TEST 2: SMT (newMemEmptyTrie) ===
    console.log('=== TEST 2: SMT (newMemEmptyTrie) Implementation ===');
    
    const smt = await newMemEmptyTrie();
    await smt.insert(key, amount);
    
    const smtRoot = poseidon.F.toString(smt.root);
    console.log('SMT Root:', smtRoot);
    
    const smtProof = await smt.find(key);
    console.log('SMT Found:', smtProof.found);
    console.log('SMT Siblings:', smtProof.siblings ? smtProof.siblings.map(s => poseidon.F.toString(s)) : []);
    console.log();

    // === TEST 3: Manual Calculation to match Circom ===
    console.log('=== TEST 3: Manual Calculation (Circom-style) ===');
    
    // Calculate leaf hash exactly like in Circom (SMTHash1)
    const circomLeafHash = BigInt(poseidon.F.toString(poseidon([key, amount])));
    console.log('Circom Leaf Hash:', circomLeafHash.toString());
    
    // Get user address bits (for path)
    const addressBits = [];
    let tempAddress = key;
    for (let i = 0; i < TREE_LEVELS; i++) {
        addressBits.push(Number(tempAddress & 1n));
        tempAddress = tempAddress >> 1n;
    }
    console.log('Address bits (bottom 5 bits):', addressBits);
    
    // Manual root calculation using SMT siblings
    if (smtProof.siblings && smtProof.siblings.length > 0) {
        let currentHash = circomLeafHash;
        console.log('\nManual calculation steps:');
        console.log('Starting with leaf:', currentHash.toString());
        
        for (let i = TREE_LEVELS - 1; i >= 0; i--) {
            const sibling = i < smtProof.siblings.length 
                ? BigInt(poseidon.F.toString(smtProof.siblings[i]))
                : BigInt(0);
            
            let left, right;
            if (addressBits[i] === 0) {
                left = currentHash;
                right = sibling;
            } else {
                left = sibling;
                right = currentHash;
            }
            
            currentHash = BigInt(poseidon.F.toString(poseidon([left, right])));
            console.log(`Level ${i}: bit=${addressBits[i]}, sibling=${sibling.toString()}, left=${left.toString()}, right=${right.toString()}, hash=${currentHash.toString()}`);
        }
        
        console.log('\nManual Root:', currentHash.toString());
    }
    
    // === COMPARISON ===
    console.log('\n=== COMPARISON ===');
    console.log('Simple MerkleTree Root:', simpleRoot.toString());
    console.log('SMT Root:              ', smtRoot);
    console.log('Expected (input.json): ', '19587345328008053617139563616359245107049912753407118495771756762925806146657');
    console.log('Circom Computed:       ', '11384454204808957643837538675350690738627470318504081462803728526878534443752');
    
    console.log('\nRoots match SMT?', smtRoot === '19587345328008053617139563616359245107049912753407118495771756762925806146657');
    console.log('Roots match Circom?', smtRoot === '11384454204808957643837538675350690738627470318504081462803728526878534443752');
    
    // === NULLIFIER TEST ===
    console.log('\n=== NULLIFIER TEST ===');
    const nullifier = generateNullifier(testAddress, 'secret_0');
    const nullifierHash = BigInt(poseidon.F.toString(poseidon([key, nullifier])));
    
    console.log('Nullifier:', nullifier.toString());
    console.log('Nullifier Hash:', nullifierHash.toString());
    console.log('Expected Nullifier Hash:', '15230276127735476341423762249815793153920203672698063881747576312015810091358');
    console.log('Nullifier matches?', nullifierHash.toString() === '15230276127735476341423762249815793153920203672698063881747576312015810091358');
    
    return {
        simpleMerkleRoot: simpleRoot.toString(),
        smtRoot: smtRoot,
        expectedRoot: '19587345328008053617139563616359245107049912753407118495771756762925806146657',
        circomRoot: '11384454204808957643837538675350690738627470318504081462803728526878534443752',
        nullifierHash: nullifierHash.toString(),
        expectedNullifierHash: '15230276127735476341423762249815793153920203672698063881747576312015810091358'
    };
}

// Run test if called directly
if (require.main === module) {
    testMerkleTreeComparison().catch(console.error);
}

module.exports = { testMerkleTreeComparison, MerkleTree };
