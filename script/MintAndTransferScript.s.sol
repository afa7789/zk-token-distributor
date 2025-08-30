// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import {ZKAirDroppedToken} from "../src/ProjectToken.sol";
import {ZKTokenDistributor} from "../src/ZKTokenDistributor.sol";

contract MintAndTransferScript is Script {
    function run() external {
        // Read deployment addresses from broadcast file
        string memory deploymentFile = "./broadcast/Deployer.s.sol/31337/run-latest.json";
        string memory json = vm.readFile(deploymentFile);

        // Parse contract addresses from deployment
        address tokenAddress = vm.parseJsonAddress(json, ".transactions[0].contractAddress");
        address distributorAddress = vm.parseJsonAddress(json, ".transactions[2].contractAddress");

        // Initialize contracts with deployed addresses
        ZKAirDroppedToken token = ZKAirDroppedToken(tokenAddress);
        ZKTokenDistributor distributor = ZKTokenDistributor(distributorAddress);

        // Get the deployer's address from the context.
        // vm.addr(vm.envUint("PRIVATE_KEY")) still works but is better used for context.
        address deployerAddr = vm.addr(vm.envUint("PRIVATE_KEY"));

        // Get amount from CLI or SMT JSON
        uint256 mintAmount;
        try vm.envString("MINT_AMOUNT") returns (string memory amountStr) {
            if (bytes(amountStr).length > 0) {
                mintAmount = vm.parseUint(amountStr);
            } else {
                string memory smtJson = vm.readFile("./out/smt_results.json");
                bytes memory totalAmountBytes = vm.parseJson(smtJson, "totalAmount");
                mintAmount = vm.parseUint(string(totalAmountBytes));
            }
        } catch {
            string memory smtJson = vm.readFile("./out/smt_results.json");
            bytes memory totalAmountBytes = vm.parseJson(smtJson, "totalAmount");
            mintAmount = vm.parseUint(string(totalAmountBytes));
        }

        // Determine destination address
        address destination;
        try vm.envString("DESTINATION") returns (string memory destStr) {
            if (bytes(destStr).length > 0) {
                destination = vm.parseAddress(destStr);
            } else {
                destination = address(distributor);
            }
        } catch {
            destination = address(distributor);
        }

        // Start broadcasting without passing a private key directly.
        // Foundry will use the key provided via the command line.
        vm.startBroadcast();
        
        // Mint tokens to deployer
        token.mint(deployerAddr, mintAmount);
        
        // Transfer all tokens to destination
        token.transfer(destination, mintAmount);
        
        vm.stopBroadcast();
    }
}