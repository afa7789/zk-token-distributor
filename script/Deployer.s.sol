// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import "../src/ProjectToken.sol";
import "../src/VerifierZK.sol";
import "../src/ZKTokenDistributor.sol";

contract Deployer is Script {
    using stdJson for string;

    function run() external {
        vm.startBroadcast();

        // Try to read SMT results from file, fallback to hardcoded values
        uint256 smtRootUint;
        uint256 totalAmount;

        // Try to read SMT results from a single file path
        bool fileRead = false;
        string memory filePath = "out/smt_results_fixed.json";
        try vm.readFile(filePath) returns (string memory json) {
            // Extract SMT root and total amount from file
            smtRootUint = json.readUint(".smtRoot");
            totalAmount = json.readUint(".totalAmount");
            console.log("Successfully read SMT data from:", filePath);
            fileRead = true;
        } catch {
            console.log("Failed to read from:", filePath);
        }

        if (!fileRead) {
            // Fallback to hardcoded values if all file reads fail
            smtRootUint = 16666497923320249555914241076237687966975321983021180127675531303796012127065;
            totalAmount = 540000000000000000000000; // 540,000 tokens
            console.log("Using hardcoded SMT data (all file reads failed)");
        }

        // Convert SMT root from uint256 to bytes32
        bytes32 merkleRoot = bytes32(smtRootUint);

        console.log("SMT Root (uint256):", smtRootUint);
        console.log("SMT Root (bytes32):", vm.toString(merkleRoot));
        console.log("Total Claimable Amount:", totalAmount);
        // Log the current block timestamp to help debug InvalidTimestamp errors
        console.log("Current block.timestamp:", block.timestamp);

        // Deploy Verifier first
        VerifierZK verifier = new VerifierZK();
        console.log("VerifierZK deployed at:", address(verifier));

        console.log("Deployer address:", msg.sender);

        // Deploy Token with proper constructor parameters
        ZKAirDroppedToken token = new ZKAirDroppedToken(
            "ZK Airdrop Token",
            "ZKAT",
            msg.sender // Using msg.sender as the deployer
        );
        console.log("ZKAirDroppedToken deployed at:", address(token));

        // Deploy Distributor with all required parameters
        ZKTokenDistributor distributor = new ZKTokenDistributor(
            merkleRoot, // _root
            IERC20(address(token)), // _token
            address(verifier), // _verifier
            totalAmount, // _totalClaimable
            // Give a larger buffer to ensure start is strictly in the future
            block.timestamp + 5 minutes, // _claimPeriodStart (starts in ~5 minutes)
            block.timestamp + 30 days // _claimPeriodEnd (30 days from now)
        );
        console.log("ZKTokenDistributor deployed at:", address(distributor));

        // Mint tokens to distributor for distribution
        token.mint(address(distributor), totalAmount);
        console.log("Minted", totalAmount, "tokens to distributor");

        vm.stopBroadcast();
    }
}
