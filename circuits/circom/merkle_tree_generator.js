// Updated Generator Description
// To align circuits/circom/merkle_tree_generator.js with the circuit and fix the JSON format:
// Goal
// Builds a standard Merkle Tree from a CSV of addresses and amounts, computes Poseidon hashes (leaf, node, nullifier), generates inclusion proofs (pathElements and pathIndices), verifies them locally, and outputs JSON files compatible with the MerkleTreeInclusion(5) circuit.
// Inputs

// File: ../../data/addresses.csv
// Format: CSV with header; each row: address,amount (e.g., 0x123...,1000)
// Derived:

// Read SECRET from .env in ../../ root.
// key: Address as BigInt (from hex without 0x).
// nullifier: SHA-256(address + SECRET) as BigInt.
// nullifierHash: Poseidon([key, nullifier]).
// leaf: Poseidon([key, amount]).

// Merkle Tree (High-Level)

// Standard Merkle Tree: Full tree with leaves in CSV order, padded to 2^5 = 32 leaves with 0n.
// Leaves: Poseidon([key, amount]).
// Nodes: Poseidon([left, right]).
// Depth: TREE_LEVELS = 5.
// Proofs:

// pathElements: Array of 5 sibling hashes (LSB-first).
// pathIndices: Integer (0 to 31) for leaf position.
// Verified locally by recomputing root.

// Outputs

// File: ../../out/smt_results_fixed.json

// Contains:

// root: String (Merkle root).
// treeLevels: Number (5).
// hashFunction: "Poseidon".
// totalAmount: String (sum of amounts).
// leaves: Array of objects with:

// key: Address string.
// keyUint: Key as string.
// value: Amount as string.
// leaf: Leaf hash as string.
// nullifier: Nullifier as string.
// nullifierHash: Nullifier hash as string.
// pathElements: Array of 5 sibling hashes (strings).
// pathIndices: Leaf position as string.
// isValid: Boolean (local verification result).

// File: ../../out/inputs_circom_fixed.json

// Array of Circom-ready objects, each:
// json{
//     "leaf": "<leaf_hash>",
//     "amount": "<amount>",
//     "pathIndices": "<leaf_position>",
//     "pathElements": ["<sibling1>", "<sibling2>", "<sibling3>", "<sibling4>", "<sibling5>"],
//     "merkleRoot": "<root>",
//     "nullifierHash": "<nullifier_hash>"
// }

// Scope for Standard Merkle Tree

// Implement in merkle_tree.js (array-based or recursive).
// Assign leaves sequentially (indices 0 to n-1), pad with 0n to 32 leaves.
// Compute pathElements (5 siblings, LSB-first) and pathIndices (integer).
// Use circomlibjs for Poseidon hashing.
// Read SECRET from .env.
// Keep CSV input and JSON output formats.
// Ensure compatibility with MerkleTreeInclusion(5) inputs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { MerkleTree, poseidonHash } from './merkle_tree.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TREE_LEVELS = 5;
const TREE_CAPACITY = 2 ** TREE_LEVELS; // 32 leaves

// Convert hex address to BigInt (remove 0x prefix)
function addressToBigInt(address) {
    const cleanAddress = address.toLowerCase().replace('0x', '');
    return BigInt('0x' + cleanAddress);
}

// Generate nullifier using SHA-256(address + SECRET)
function generateNullifier(address, secret) {
    const combined = address + secret;
    const hash = createHash('sha256').update(combined).digest('hex');
    return BigInt('0x' + hash);
}

// Convert pathIndices array to integer position (LSB-first)
function pathIndicesToPosition(pathIndices) {
    return pathIndices.reduce((position, bit, level) => {
        return position + (bit * (2 ** level));
    }, 0);
}

// Verify proof using the same logic as the circuit
function verifyMerkleProof(leaf, pathElements, pathIndices, expectedRoot) {
    let computedHash = leaf;
    
    // Convert pathIndices integer to binary array if needed
    const pathBits = typeof pathIndices === 'number' 
        ? pathIndices.toString(2).padStart(TREE_LEVELS, '0').split('').reverse().map(b => parseInt(b))
        : pathIndices;
    
    for (let i = 0; i < pathElements.length; i++) {
        const sibling = pathElements[i];
        const isRight = pathBits[i] === 1;
        
        if (isRight) {
            computedHash = poseidonHash(sibling, computedHash);
        } else {
            computedHash = poseidonHash(computedHash, sibling);
        }
    }
    
    return computedHash === expectedRoot;
}

async function generateMerkleTree() {
    console.log('Starting Merkle tree generation...');
    
    // Read SECRET from environment
    const SECRET = process.env.SECRET;
    if (!SECRET) {
        throw new Error('SECRET not found in .env file');
    }
    
    // Read CSV file
    const csvPath = path.resolve(__dirname, '../../data/addresses.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    // Parse CSV
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });
    
    console.log(`Loaded ${records.length} records from CSV`);
    
    if (records.length > TREE_CAPACITY) {
        throw new Error(`Too many records (${records.length}). Maximum capacity is ${TREE_CAPACITY}`);
    }
    
    // Process addresses and amounts
    const processedData = [];
    let totalAmount = 0n;
    
    for (const record of records) {
        const address = record.address;
        const amount = BigInt(record.amount);
        
        // Convert address to key (BigInt)
        const key = addressToBigInt(address);
        
        // Generate nullifier
        const nullifier = generateNullifier(address, SECRET);
        
        // Generate nullifier hash
        const nullifierHash = poseidonHash(key, nullifier);
        
        // Generate leaf hash
        const leaf = poseidonHash(key, amount);
        
        processedData.push({
            address,
            key,
            amount,
            nullifier,
            nullifierHash,
            leaf
        });
        
        totalAmount += amount;
    }
    
    // Create leaves array for the Merkle tree
    const leaves = processedData.map(data => data.leaf);
    
    // Build Merkle tree using your implementation
    const merkleTree = new MerkleTree(TREE_LEVELS, leaves);
    const root = merkleTree.root();
    
    console.log(`Merkle tree built with root: ${root.toString()}`);
    console.log(`Tree has ${merkleTree.number_of_elements()} elements`);
    
    // Generate proofs and verify them
    const leavesWithProofs = [];
    const circomInputs = [];
    
    for (let i = 0; i < processedData.length; i++) {
        const data = processedData[i];
        
        // Get proof from your MerkleTree implementation
        const proof = merkleTree.path(i);
        
        // Convert pathIndices array to position integer (for LSB-first format)
        const leafPosition = pathIndicesToPosition(proof.pathIndices);
        
        // Verify proof locally using our verification function
        const isValid = verifyMerkleProof(
            data.leaf, 
            proof.pathElements, 
            proof.pathIndices, 
            root
        );
        
        // Also verify using the tree's built-in verification (if available)
        const isValidBuiltin = proof.merkleRoot === root;
        
        if (!isValid || !isValidBuiltin) {
            console.error(`Proof verification failed for leaf ${i}:`, {
                isValid,
                isValidBuiltin,
                computed: proof.merkleRoot?.toString(),
                expected: root.toString()
            });
        }
        
        // Format for smt_results_fixed.json
        const leafData = {
            key: data.address,
            keyUint: data.key.toString(),
            value: data.amount.toString(),
            leaf: data.leaf.toString(),
            nullifier: data.nullifier.toString(),
            nullifierHash: data.nullifierHash.toString(),
            pathElements: proof.pathElements.map(pe => pe.toString()),
            pathIndices: leafPosition.toString(), // Use integer position
            isValid: isValid && isValidBuiltin
        };
        
        leavesWithProofs.push(leafData);
        
        // Format for inputs_circom_fixed.json
        const circomInput = {
            leaf: data.leaf.toString(),
            amount: data.amount.toString(),
            pathIndices: leafPosition.toString(), // Use integer position
            pathElements: proof.pathElements.map(pe => pe.toString()),
            merkleRoot: root.toString(),
            nullifierHash: data.nullifierHash.toString()
        };
        
        circomInputs.push(circomInput);
    }
    
    // Create output directory
    const outDir = path.resolve(__dirname, '../../out');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    
    // Generate smt_results_fixed.json
    const smtResults = {
        root: root.toString(),
        treeLevels: TREE_LEVELS,
        hashFunction: "Poseidon",
        totalAmount: totalAmount.toString(),
        leaves: leavesWithProofs
    };
    
    const smtResultsPath = path.join(outDir, 'smt_results_fixed.json');
    fs.writeFileSync(smtResultsPath, JSON.stringify(smtResults, null, 2));
    console.log(`SMT results written to: ${smtResultsPath}`);
    
    // Generate inputs_circom_fixed.json
    const circomInputsPath = path.join(outDir, 'inputs_circom_fixed.json');
    fs.writeFileSync(circomInputsPath, JSON.stringify(circomInputs, null, 2));
    console.log(`Circom inputs written to: ${circomInputsPath}`);
    
    // Summary
    console.log('\n=== Generation Summary ===');
    console.log(`Total addresses processed: ${processedData.length}`);
    console.log(`Tree levels: ${TREE_LEVELS}`);
    console.log(`Tree capacity: ${TREE_CAPACITY}`);
    console.log(`Merkle root: ${root.toString()}`);
    console.log(`Total amount: ${totalAmount.toString()}`);
    console.log(`All proofs valid: ${leavesWithProofs.every(l => l.isValid)}`);
    
    // Validation checks
    const invalidProofs = leavesWithProofs.filter(l => !l.isValid);
    if (invalidProofs.length > 0) {
        console.error(`❌ ${invalidProofs.length} invalid proofs found!`);
        invalidProofs.forEach((leaf, idx) => {
            console.error(`  Invalid proof for leaf ${idx}: ${leaf.key}`);
        });
    }
    
    return {
        root,
        treeLevels: TREE_LEVELS,
        totalAmount,
        processedCount: processedData.length,
        allValid: leavesWithProofs.every(l => l.isValid)
    };
}

// Run if called directly
if (process.argv[1] === __filename) {
    generateMerkleTree()
        .then(result => {
            console.log('\n✅ Merkle tree generation completed successfully!');
            console.log(`Generated ${result.processedCount} proofs, all valid: ${result.allValid}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Error generating Merkle tree:', error);
            process.exit(1);
        });
}

export { generateMerkleTree };