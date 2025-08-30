# How to use the MerkleTree Generator
# Merkle Tree Generator with CSV Reading

This complete implementation reads data from a CSV file and generates Merkle trees with proofs using Foundry's filesystem cheatcodes.

## Merkle Tree Structure, important places

```
project/
├── script/
│   └── MerkleGenerator.s.sol
├── data/
│   └── addresses.csv
└── out/
    └── merkle_results.json (generated)
```

## Setup for Merkle tree you want to generate

### 1. Sample CSV File (`data/addresses.csv`)

```csv
address,amount
0x742d35Cc6634C0532925a3B8d406fB3c1DC17Bd8,1000000000000000000
0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed,500000000000000000
0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359,750000000000000000
0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045,2000000000000000000
0x8ba1f109551bD432803012645Hac136c01c77c3,300000000000000000
```

## Installation and Setup

### 1. Initialize Foundry Project

```bash
git clone 'http://this.repo.com' zk-airdrop
cd zk-airdrop
```

### 2. Install Dependencies

```bash
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std
forge install chancehudson/poseidon-solidity
```

### 4. Add Files

- Create the CSV file at `data/addresses.csv` with your data
- Update `foundry.toml` with the configuration above

## Usage

### 1. Run the Script

```bash
forge script script/MerkleGenerator.s.sol --ffi
```

The `--ffi` flag enables Foreign Function Interface, which is required for filesystem operations.

### 2. View Output

The script will:
- Read and parse the CSV file
- Display parsed data in the console
- Generate the Merkle root
- Create and verify proofs for each entry
- Save results to `output/merkle_results.json`

### 3. Sample Output

Console output:
```
--- Merkle Tree Generation Script ---
Successfully read CSV file: ./data/addresses.csv
Parsed 5 entries from CSV

--- Parsed CSV Data ---
Entry 1: 0x742d35Cc6634C0532925a3B8d406fB3c1DC17Bd8 -> 1000000000000000000
Entry 2: 0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed -> 500000000000000000
...

--- Merkle Root ---
0x1234567890abcdef...

--- Generating and Verifying Proofs ---
Proof for 0x742d35Cc6634C0532925a3B8d406fB3c1DC17Bd8 (amount 1000000000000000000) is valid: true
  Proof elements:
    0: 0xabcdef1234567890...
    1: 0x9876543210fedcba...
```