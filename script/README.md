# Deployer Script Usage

## Deployer

Deploys `ProjectToken`, `VerifierZK`, and `ZKTokenDistributor` contracts in one go.

### How to Deploy

1.  Run the deployer script with Foundry:
    ```sh
    forge script script/Deployer.s.sol --broadcast --rpc-url <YOUR_RPC_URL> --private-key <YOUR_PRIVATE_KEY>
    ```
    This will deploy all contracts and print their addresses.

---

For more details, see the comments in the script.

