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

    // 1. Verificação do hash do nullifier
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== userAddress;
    nullifierHasher.inputs[1] <== nullifier;
    component nullifierCheck = IsEqual();
    nullifierCheck.in[0] <== nullifierHash;
    nullifierCheck.in[1] <== nullifierHasher.out;

    // 2. Verificação de que o valor é não-zero
    component amountCheck = IsZero();
    amountCheck.in <== amount;
    signal amountNonZero <== 1 - amountCheck.out;

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

    for (var i = levels - 1; i >= 0; i--) {
        switchers[i] = Switcher();
        switchers[i].sel <== userAddressBits.out[i];
        switchers[i].L <== currentHash[i + 1];
        switchers[i].R <== siblings[i];

        hashers[i] = SMTHash2();
        hashers[i].L <== switchers[i].outL;
        hashers[i].R <== switchers[i].outR;
        currentHash[i] <== hashers[i].out;
    }

    // 6. Verificação do root final
    component rootCheck = IsEqual();
    rootCheck.in[0] <== currentHash[0];
    rootCheck.in[1] <== merkleRoot;

    // Usando restrições para garantir as verificações sem uma saída 'valid'
     // Fix for the non-quadratic constraint error
    
    // 1. Multiply the first two validation results
    signal temp <== nullifierCheck.out * amountNonZero;
    
    // 2. Multiply the result with the third validation
    temp * rootCheck.out === 1;
}

component main = AirdropInclusionOnly(5);