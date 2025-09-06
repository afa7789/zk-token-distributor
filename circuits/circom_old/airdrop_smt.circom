pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/smt/smthash_poseidon.circom";
include "node_modules/circomlib/circuits/bitify.circom";
include "node_modules/circomlib/circuits/switcher.circom";

template AirdropInclusionOnly(levels) {
    // Inputs Públicos
    signal input merkleRoot;
    signal input nullifierHash;
    signal input amount;

    // Inputs Privados
    signal input userAddress;
    signal input nullifier;
    signal input siblings[levels];

    // Saídas públicas para forçar o reconhecimento pelo compilador
    // Agora apenas 3 saídas, conforme o desejado
    signal output merkleRootOut;
    signal output nullifierHashOut;
    signal output amountOut;

    // Vinculando inputs a outputs para evitar otimização
    merkleRootOut <== merkleRoot;
    nullifierHashOut <== nullifierHash;
    amountOut <== amount;

    component hashValue = SMTHash2();
    hashValue.L <== 1;
    hashValue.R <== 1;
    log("hash0(1,1) == ", hashValue.out);

    component hashValue0 = SMTHash2();
    hashValue0.L <== 0;
    hashValue0.R <== 0;
    log("hash0(0,0) == ", hashValue0.out);

    component hashValue1 = SMTHash1();
    hashValue1.key <== 1;
    hashValue1.value <== 1;
    log("hash1(1,1) == ", hashValue1.out);

    component hashValue01 = SMTHash1();
    hashValue01.key <== 0;
    hashValue01.value <== 0;
    log("hash1(0,0) == ", hashValue01.out);


    // 1. Verificação do hash do nullifier
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== userAddress;
    nullifierHasher.inputs[1] <== nullifier;
    component nullifierCheck = IsEqual();
    nullifierCheck.in[0] <== nullifierHash;
    nullifierCheck.in[1] <== nullifierHasher.out;
    
    log("Expected nullifierHash:", nullifierHash);
    log("Computed nullifierHash:", nullifierHasher.out);
    log("nullifierCheck result:", nullifierCheck.out);

    // 2. Verificação de que o valor é não-zero
    component amountCheck = IsZero();
    amountCheck.in <== amount;
    signal amountNonZero <== 1 - amountCheck.out;
    
    log("Amount:", amount);
    log("amountNonZero result:", amountNonZero);

    // 3. Criação do hash da folha para a SMT
    component leafHash = SMTHash1();
    leafHash.key <== userAddress;
    leafHash.value <== amount;

    // 4. Conversão do endereço do usuário para bits
    component userAddressBits = Num2Bits(160);
    userAddressBits.in <== userAddress;

    // 5. Verificação do caminho Merkle
    component hashers[levels];
    component switchers[levels];
    signal currentHash[levels + 1];
    currentHash[levels] <== leafHash.out;
    log("leaf:", leafHash.out);
    log("Amount:", amount);
    log("userAddress:", userAddress);
    log("siblings:");
    for(var i =0; i<levels; i++){
        log("sibling",i,siblings[i]);
    }
    for (var i = levels - 1; i >= 0; i--) {
        switchers[i] = Switcher();
        switchers[i].sel <== userAddressBits.out[i];
        switchers[i].L <== currentHash[i + 1];
        switchers[i].R <== siblings[i];

        log("switchers",i,switchers[i].L,switchers[i].R);

        hashers[i] = SMTHash2();
        hashers[i].L <== switchers[i].outL;
        hashers[i].R <== switchers[i].outR;
        currentHash[i] <== hashers[i].out;
    }

    // 6. Verificação do root final
    component rootCheck = IsEqual();
    rootCheck.in[0] <== currentHash[0];
    rootCheck.in[1] <== merkleRoot;
    
    log("Computed merkleRoot:", currentHash[0]);
    log("Expected merkleRoot:", merkleRoot);
    log("rootCheck result:", rootCheck.out);

    // Usando restrições para garantir as verificações sem uma saída 'valid'
    // Fix for the non-quadratic constraint error
    
    // 1. Multiply the first two validation results
    signal temp <== nullifierCheck.out * amountNonZero;

    log("temp (nullifierCheck * amountNonZero):", temp);
    
    // 2. Multiply the result with the third validation
    temp * rootCheck.out === 1;
}

component main = AirdropInclusionOnly(5);