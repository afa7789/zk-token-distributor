pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/smt/smthash_poseidon.circom";
include "node_modules/circomlib/circuits/bitify.circom";
include "node_modules/circomlib/circuits/switcher.circom";

// Simplified version for SMT inclusion only
// Removes all complexity related to exclusion proofs
template AirdropInclusionOnly(levels) {
    // Public inputs
    signal input merkleRoot;
    signal input nullifierHash;
    
    // Private inputs  
    signal input userAddress;
    signal input amount;
    signal input nullifier;
    signal input siblings[levels];
    
    // Outputs
    signal output valid;
    
    // 1. Verify nullifier
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== userAddress;
    nullifierHasher.inputs[1] <== nullifier;
    nullifierHash === nullifierHasher.out;
    
    // 2. Verify amount > 0
    component amountCheck = GreaterThan(252);
    amountCheck.in[0] <== amount;
    amountCheck.in[1] <== 0;
    
    // 3. Create leaf hash for SMT: H(1 | userAddress | amount)
    component leafHash = SMTHash1();
    leafHash.key <== userAddress;
    leafHash.value <== amount;
    
    // 4. Convert userAddress to bits to navigate the tree (use all 160 bits)
    component userAddressBits = Num2Bits(160);
    userAddressBits.in <== userAddress;
    
    // 5. Verify the path in SMT manually (more efficient)
    component hashers[levels];
    component switchers[levels];
    
    signal currentHash[levels + 1];
    currentHash[levels] <== leafHash.out;
    
    for (var i = levels - 1; i >= 0; i--) {
        // Switcher to place current hash on the left or right
        switchers[i] = Switcher();
        switchers[i].sel <== userAddressBits.out[i]; // Use the lowest bits for tree navigation
        switchers[i].L <== currentHash[i + 1];
        switchers[i].R <== siblings[i];
        
        // Parent node hash
        hashers[i] = SMTHash2();
        hashers[i].L <== switchers[i].outL;
        hashers[i].R <== switchers[i].outR;
        
        currentHash[i] <== hashers[i].out;
    }
    
    // 6. Verify if we reached the correct root
    component rootCheck = IsEqual();
    rootCheck.in[0] <== currentHash[0];
    rootCheck.in[1] <== merkleRoot;
    
    // Output - valid if root matches and amount > 0
    valid <== rootCheck.out * amountCheck.out;
}

component main = AirdropInclusionOnly(5);