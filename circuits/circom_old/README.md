# Airdrop ZK Circuit


## Setup

```bash
pushd circuits/circom
# 1. Install dependencies
bun install
mkdir output
# 2. Compile circuit
circom airdrop_smt.circom --r1cs --wasm --sym --output output
mv output/airdrop_smt_js/* output
rm -rf output/airdop_smt_js

# 3. Download powers of tau (if needed)
# download it from here: https://github.com/iden3/snarkjs?tab=readme-ov-file
wget https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_15.ptau

# 4. Trusted setup
snarkjs groth16 setup output/airdrop_smt.r1cs powersOfTau28_hez_final_15.ptau output/airdrop_smt_00.zkey
snarkjs zkey contribute output/airdrop_smt_00.zkey output/airdrop_smt_01.zkey --name="First" # you will have to enter a text for entropy here

snarkjs zkey export verificationkey output/airdrop_smt_01.zkey output/verification_key.json
```

## Generate Proof

```bash
# 1. Create input.json
# This is the entry related to a person, so we need the merkle tree
# the merkle proof ( siblings path) + other user info.
echo '{
  "merkleRoot": "1234567890123456789012345678901234567890123456789012345678901234",
  "nullifierHash": "9876543210987654321098765432109876543210987654321098765432109876",
  "userAddress": "1111111111111111111111111111111111111111111111111111111111111111",
  "amount": "1000",
  "nullifier": "5555555555555555555555555555555555555555555555555555555555555555",
  "siblings": ["0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0"]
}' > input.json

# 2. Generate witness
bun output/generate_witness.js output/airdrop_smt.wasm input.json output/witness.wtns

# 3. Generate proof
snarkjs groth16 prove output/airdrop_smt_01.zkey output/witness.wtns output/proof.json output/public.json

# 4. Verify proof
snarkjs groth16 verify output/verification_key.json output/public.json output/proof.json
```

## Export Verifier

```bash
# Export Solidity verifier
snarkjs zkey export solidityverifier output/airdrop_smt_01.zkey output/AirdropVerifier.sol

# Export calldata
snarkjs zkey export soliditycalldata output/public.json output/proof.json > output/calldata.txt
```
