pragma circom 2.0.0;
include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/bitify.circom";

// Computes Poseidon([left, right])
template HashLeftRight() {
    signal input left;
    signal input right;
    signal output hash;

    component hasher = Poseidon(2);
    hasher.inputs[0] <== left;
    hasher.inputs[1] <== right;
    hash <== hasher.out;
}

// if s == 0 returns [in[0], in[1]]
// if s == 1 returns [in[1], in[0]]
template DualMux() {
    signal input in[2];
    signal input s;
    signal output out[2];

    s * (1 - s) === 0;
    out[0] <== (in[1] - in[0])*s + in[0];
    out[1] <== (in[0] - in[1])*s + in[1];
}

// Computes and outputs a merkle root based on the provided merkle proof.
// pathIndices input is an array of 0/1 selectors telling whether given pathElement is on the left or right side of merkle path
template RawMerkleTree(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    signal output root;

    component selectors[levels];
    component hashers[levels];

    for (var i = 0; i < levels; i++) {
        selectors[i] = DualMux();
        selectors[i].in[0] <== i == 0 ? leaf : hashers[i - 1].hash;
        selectors[i].in[1] <== pathElements[i];
        selectors[i].s <== pathIndices[i];

        hashers[i] = HashLeftRight();
        hashers[i].left <== selectors[i].out[0];
        hashers[i].right <== selectors[i].out[1];
    }

    root <== hashers[levels - 1].hash;
}

template MerkleTreeInclusion(levels) {
    // Private inputs that the circuit will verify (default is private)
    signal input userAddress;
    signal input amount;
    signal input nullifier;
    signal input pathElements[levels];
    signal input pathIndices;
    signal input expectedNullifierHash; // Expected nullifierHash for verification

    signal input merkleRoot;

    // Public outputs  
    signal output nullifierHashOut;
    signal output amountOut;
    signal output merkleRootOut;

    // Compute leaf = Poseidon([userAddress, amount])
    component leafHasher = Poseidon(2);
    leafHasher.inputs[0] <== userAddress;
    leafHasher.inputs[1] <== amount;
    signal leaf;
    leaf <== leafHasher.out;

    // Compute nullifierHash = Poseidon([Poseidon([userAddress, nullifier]), amount])
    component nullifierBaseHasher = Poseidon(2);
    nullifierBaseHasher.inputs[0] <== userAddress;
    nullifierBaseHasher.inputs[1] <== nullifier;
    
    component nullifierFinalHasher = Poseidon(2);
    nullifierFinalHasher.inputs[0] <== nullifierBaseHasher.out;
    nullifierFinalHasher.inputs[1] <== amount;
    signal nullifierHash;
    nullifierHash <== nullifierFinalHasher.out;

    // Merkle tree verification
    component indexBits = Num2Bits(levels);
    indexBits.in <== pathIndices;

    component tree = RawMerkleTree(levels);
    tree.leaf <== leaf;
    for (var i = 0; i < levels; i++) {
        tree.pathIndices[i] <== indexBits.out[i];
        tree.pathElements[i] <== pathElements[i];
    }

    // Verify the computed root matches the expected root
    tree.root === merkleRoot;

    // Verify the computed nullifierHash matches the expected one
    nullifierHash === expectedNullifierHash;

    // Output the verified values (these become public outputs)
    merkleRootOut <== merkleRoot;
    nullifierHashOut <== nullifierHash;
    amountOut <== amount;
}

component main = MerkleTreeInclusion(5);