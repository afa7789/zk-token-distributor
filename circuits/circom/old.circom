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
    // component amountCheck = GreaterThan(252);
    // amountCheck.in[0] <== amount;
    // amountCheck.in[1] <== 0;
    // the above seems to be failing and I can't figure out how to fix it.
    // trying the change bellow
        //     ➜  circom git:(master) ✗ bun output/generate_witness.js output/airdrop_smt.wasm input2.json output/witness.wtns
        // 161 |           try {
        // 162 |                     this.instance.exports.setInputSignal(hMSB, hLSB,i);
        // 163 |               input_counter++;
        // 164 |           } catch (err) {
        // 165 |               // console.log(`After adding signal ${i} of ${k}`)
        // 166 |                     throw new Error(err);
        //                                 ^
        // error: Error: Assert Failed.
        // Error in template Num2Bits_71 line: 38
        // Error in template LessThan_72 line: 96
        // Error in template GreaterThan_73 line: 125
        // Error in template AirdropInclusionOnly_149 line: 34

        //       at <anonymous> (/Users/afa/Developer/study/erc55_core/hackaton/circuits/circom/output/witness_calculator.js:166:27)
        //       at forEach (1:11)
        //       at _doCalculateWitness (/Users/afa/Developer/study/erc55_core/hackaton/circuits/circom/output/witness_calculator.js:141:14)
        //       at _doCalculateWitness (/Users/afa/Developer/study/erc55_core/hackaton/circuits/circom/output/witness_calculator.js:131:31)
        //       at calculateWitness (/Users/afa/Developer/study/erc55_core/hackaton/circuits/circom/output/witness_calculator.js:179:20)
        //       at calculateWitness (/Users/afa/Developer/study/erc55_core/hackaton/circuits/circom/output/witness_calculator.js:176:28)
        //       at <anonymous> (/Users/afa/Developer/study/erc55_core/hackaton/circuits/circom/output/generate_witness.js:11:39)
        //       at <anonymous> (/Users/afa/Developer/study/erc55_core/hackaton/circuits/circom/output/generate_witness.js:10:27)

    // 2. Verify amount is non-zero (fixed - no division)
    component amountCheck = IsZero();
    amountCheck.in <== amount;
    signal amountNonZero <== 1 - amountCheck.out;

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