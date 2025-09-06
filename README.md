# ZK Token Distributor — Demo

This repository contains a token airdrop flow protected by a Sparse Merkle Tree + Circom proofs. The steps below are a compact, practical guide to prepare proofs, build/deploy contracts, and run the web app locally.

## Prerequisites

- Foundry (forge/anvil) installed and in PATH
- Node.js >= 16 or Bun (the repo includes a `bun.lock` in `webapp/` and `circuits/circom/`)
- circom & snarkjs (for circuit compile / proving) or follow the JS-based scripts in `circuits/circom/`
- `powersOfTau28_hez_final_15.ptau` is present in `circuits/circom/`

If you rely on the provided Foundry scripts for Merkle/proof generation, Foundry must be built with `--ffi` enabled for external calls.

## 1. Prepare Merkle tree and (optional) ZK proofs

1. Populate airdrop recipients:

    - Edit `data/addresses.csv` with `address,amount` rows.

2. Generate Merkle tree (Foundry script):

    - The repo includes a script to build the Merkle data from `data/addresses.csv`. Run it locally (it may use `--ffi` to call Node/Circom tooling):

    ```bash
    forge script script/MerkleGenerator.s.sol --ffi
    # use the alternative the above need fixes.
    pushd circuits/circom
    bun generator_merkle_tree2.js  
    popd
    ```

    - Output files (merkle root, proofs, leaves) are written to `data/` or the `circuits` output. Check the script source if you need exact paths.

3. (Optional) Compile circuit and produce proofs with circom + snarkjs [circuits/circom/README.md](circuits/circom/README.md)
    - Adjust these commands and circuit if you use a different proving system. 
    - THE SMT tree level can be changed in it circom file and foundry script generator.

## 2. Build & deploy contracts

1. Build contracts with Foundry:

    ```bash
    forge build
    ```

2. Deploy using the repository script

    - If you want to run a local deployment against Anvil:

    ```bash
    anvil --silent &
    # use Anvil's default RPC (http://127.0.0.1:8545) and one of the displayed private keys
    ```

    - Example deploy (assumes `script/Deployer.s.sol` exposes a `Deployer` script contract). Replace the placeholders with your RPC URL and private key. Use `--broadcast` to submit transactions.

    ```bash
    forge script script/Deployer.s.sol:Deployer --rpc-url <RPC_URL> --private-key <PRIVATE_KEY> --broadcast -vvvv
    ```



## 3. Run the web application

1. Enter the webapp folder and install:

    ```bash
    cd webapp
    bun install   # or `npm ci` / `pnpm install` if you prefer
    ```

2. Start dev server:

    ```bash
    bun dev       # or `npm run dev`
    ```

3. Configure the UI

    - Point the app to the deployed contract addresses / network in the app config (check `webapp/src/lib` or the environment variables the app expects).
