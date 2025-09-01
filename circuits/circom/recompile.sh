#!/bin/bash

# --- Configuração ---
CIRCOM_FILE="airdrop_smt.circom"
R1CS_OUTPUT="output/airdrop_smt.r1cs"
PTAU_FILE="powersOfTau28_hez_final_15.ptau"
ZKEY_INITIAL="output/airdrop_smt_00.zkey"
ZKEY_CONTRIBUTED="output/airdrop_smt_01.zkey"
VERIFICATION_KEY="output/verification_key.json"
SOL_VERIFIER="output/AirdropVerifier.sol"
ENTROPY_TEXT="First contribution" # Texto de entropia para o zkey contribute

# --- Cria o diretório de saída ---
mkdir -p output

# --- Compilação do circuito com circom ---
echo "Iniciando a compilação do circuito com circom..."
circom "$CIRCOM_FILE" --r1cs --wasm --sym -o output/

# --- Movendo e limpando arquivos (caso necessário) ---
echo "Organizando arquivos de saída..."
if [ -d "output/${CIRCOM_FILE%.*}_js" ]; then
    mv "output/${CIRCOM_FILE%.*}_js"/* output/
    rm -rf "output/${CIRCOM_FILE%.*}_js"
fi

# --- Execução das etapas do snarkjs ---

# 1. Setup Groth16
echo "Executando snarkjs groth16 setup..."
snarkjs groth16 setup "$R1CS_OUTPUT" "$PTAU_FILE" "$ZKEY_INITIAL"

# 2. Contribuição para o zkey
echo "Executando snarkjs zkey contribute..."
snarkjs zkey contribute "$ZKEY_INITIAL" "$ZKEY_CONTRIBUTED" --name="$ENTROPY_TEXT" --entropy="random_string"

# 3. Exportação da chave de verificação
echo "Exportando a chave de verificação..."
snarkjs zkey export verificationkey "$ZKEY_CONTRIBUTED" "$VERIFICATION_KEY"

# 4. Exportação do contrato verificador Solidity
echo "Exportando o contrato Solidity do verificador..."
snarkjs zkey export solidityverifier "$ZKEY_CONTRIBUTED" "$SOL_VERIFIER"

echo "Processo concluído com sucesso!"