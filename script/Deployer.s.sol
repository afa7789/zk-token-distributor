// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import "../src/ProjectToken.sol"; // This contains ZKAirDroppedToken
import "../src/VerifierZK.sol";
import "../src/ZKTokenDistributor.sol";

contract Deployer is Script {
    using stdJson for string;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);

        // Try to read SMT results from file, fallback to hardcoded values
        uint256 smtRootUint;
        uint256 totalAmount;
        
        // Try multiple file paths
        string[] memory filePaths = new string[](4);
        filePaths[0] = "../out/smt_results.json";
        filePaths[1] = "out/smt_results.json";
        filePaths[2] = "./out/smt_results.json";
        filePaths[3] = "/Users/afa/Developer/study/erc55_core/hackaton/out/smt_results.json";
        
        bool fileRead = false;
        for (uint i = 0; i < filePaths.length && !fileRead; i++) {
            try vm.readFile(filePaths[i]) returns (string memory json) {
                // Extract SMT root and total amount from file
                smtRootUint = json.readUint(".smtRoot");
                totalAmount = json.readUint(".totalAmount");
                console.log("Successfully read SMT data from:", filePaths[i]);
                fileRead = true;
            } catch {
                console.log("Failed to read from:", filePaths[i]);
            }
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

        // Deploy Verifier first
        VerifierZK verifier = new VerifierZK();
        console.log("VerifierZK deployed at:", address(verifier));

        // Deploy Token with proper constructor parameters
        ZKAirDroppedToken token = new ZKAirDroppedToken(
            "ZK Airdrop Token",
            "ZKAT", 
            deployer // deployer as initial owner
        );
        console.log("ZKAirDroppedToken deployed at:", address(token));
        
        // Deploy Distributor with all required parameters
        ZKTokenDistributor distributor = new ZKTokenDistributor(
            merkleRoot,                    // _root
            IERC20(address(token)),       // _token  
            address(verifier),            // _verifier
            totalAmount,                  // _totalClaimable
            block.timestamp + 1,          // _claimPeriodStart (starts in 1 second)
            block.timestamp + 30 days     // _claimPeriodEnd (30 days from now)
        );
        console.log("ZKTokenDistributor deployed at:", address(distributor));

        // Mint tokens to distributor for distribution
        token.mint(address(distributor), totalAmount);
        console.log("Minted", totalAmount, "tokens to distributor");

        vm.stopBroadcast();
    }
}
