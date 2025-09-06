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
# 1. Create input.json
# This is the entry related to a person, so we need the merkle tree
# the merkle proof ( siblings path) + other user info.
echo '{
	"userAddress": "1234567890123456789012345678901234567890",
	"amount": "100",
	"pathIndices": 5,
	"pathElements": [
		"1111111111111111111111111111111111111111111111111111111111111111",
		"2222222222222222222222222222222222222222222222222222222222222222",
		"3333333333333333333333333333333333333333333333333333333333333333",
		"4444444444444444444444444444444444444444444444444444444444444444",
		"5555555555555555555555555555555555555555555555555555555555555555",
		"6666666666666666666666666666666666666666666666666666666666666666",
		"7777777777777777777777777777777777777777777777777777777777777777",
		"8888888888888888888888888888888888888888888888888888888888888888",
		"9999999999999999999999999999999999999999999999999999999999999999",
		"0000000000000000000000000000000000000000000000000000000000000000",
		"1212121212121212121212121212121212121212121212121212121212121212",
		"2323232323232323232323232323232323232323232323232323232323232323",
		"3434343434343434343434343434343434343434343434343434343434343434",
		"4545454545454545454545454545454545454545454545454545454545454545",
		"5656565656565656565656565656565656565656565656565656565656565656",
		"6767676767676767676767676767676767676767676767676767676767676767",
		"7878787878787878787878787878787878787878787878787878787878787878",
		"8989898989898989898989898989898989898989898989898989898989898989",
		"9090909090909090909090909090909090909090909090909090909090909090",
		"0101010101010101010101010101010101010101010101010101010101010101"
	],
	"merkleRoot": "0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809",
	"nullifierHash": "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
}' > input.json
# example can be wrong!

# 2. Generate witness
bun output/generate_witness.js output/merkle_tree.wasm input.json output/witness.wtns

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
