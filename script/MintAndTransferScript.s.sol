// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import {Deployer} from "./Deployer.s.sol";
import {ProjectToken} from "../src/ProjectToken.sol";
import {ZKTokenDistributor} from "../src/ZKTokenDistributor.sol";

contract MintAndTransferScript is Script {
    function run() external {
        // Load deployer contract
        Deployer deployer = new Deployer();
        ProjectToken token = deployer.token();
        ZKTokenDistributor distributor = deployer.distributor();

        // Get private key from env
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployerAddr = vm.addr(deployerKey);

        // Get amount from CLI or SMT JSON
        uint256 mintAmount;
        string memory amountStr = vm.envOr("MINT_AMOUNT", "");
        if (bytes(amountStr).length > 0) {
            mintAmount = vm.parseUint(amountStr);
        } else {
            string memory json = vm.readFile("./out/smt_results.json");
            mintAmount = vm.parseJson(json, "totalAmount");
        }

        // Mint tokens to deployer
        vm.startBroadcast(deployerKey);
        token.mint(deployerAddr, mintAmount);
        // Determine destination address
        string memory destStr = vm.envOr("DESTINATION", "");
        address destination;
        if (bytes(destStr).length > 0) {
            destination = vm.parseAddress(destStr);
        } else {
            destination = address(distributor);
        }
        // Transfer all tokens to destination
        token.transfer(destination, mintAmount);
        vm.stopBroadcast();
    }
}
