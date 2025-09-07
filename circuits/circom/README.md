# Airdrop ZK Circuit

## Setup

```bash
pushd circuits/circom
# 1. Install dependencies
bun install
mkdir output
# 2. Compile circuit
circom merkle_tree.circom --r1cs --wasm --sym --output output
mv output/merkle_tree_js/* output
rm -rf output/airdop_smt_js

# 3. Download powers of tau (if needed)
# download it from here: https://github.com/iden3/snarkjs?tab=readme-ov-file
wget https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_15.ptau

# 4. Trusted setup
snarkjs groth16 setup output/merkle_tree.r1cs powersOfTau28_hez_final_15.ptau output/merkle_tree_00.zkey
snarkjs zkey contribute output/merkle_tree_00.zkey output/merkle_tree_01.zkey --name="First" # you will have to enter a text for entropy here

snarkjs zkey export verificationkey output/merkle_tree_01.zkey output/verification_key.json
```

## Generate Proof

```bash
# 1. Generate witness for a specific user
# The `merkle_tree_generator.js` script already creates `inputs_circom_fixed.json`
# with all the necessary inputs for each user.
# You can copy one of the objects from that file into a new `input.json` file.
# Or you can use the `run_prove_for_address.sh` script.
./run_prove_for_address.sh <user_address>

# The script will:
# 1. Find the user's data in `../../out/inputs_circom_fixed.json`.
# 2. Create `input.json` with the user's data.
# 3. Generate the witness.
# 4. Generate the proof.
# 5. Verify the proof.
# 6. Generate the calldata for the smart contract.

# The following steps are done automatically by the script.
# You can run them manually if you want.

# 2. Generate witness
node output/generate_witness.js output/merkle_tree.wasm input.json output/witness.wtns

# 3. Generate proof
snarkjs groth16 prove output/merkle_tree_01.zkey output/witness.wtns output/proof.json output/public.json

# 4. Verify proof
snarkjs groth16 verify output/verification_key.json output/public.json output/proof.json
```

## Export Verifier

```bash
# Export Solidity verifier
snarkjs zkey export solidityverifier output/merkle_tree_01.zkey output/AirdropVerifier.sol

# Export calldata
snarkjs zkey export soliditycalldata output/public.json output/proof.json > output/calldata.txt
```
