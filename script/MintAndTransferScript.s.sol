// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import {Deployer} from "./Deployer.s.sol";
import {ZKAirDroppedToken} from "../src/ProjectToken.sol";
import {ZKTokenDistributor} from "../src/ZKTokenDistributor.sol";

contract MintAndTransferScript is Script {
    function run() external {
        // Load deployer contract
        Deployer deployer = new Deployer();
        ZKAirDroppedToken token = deployer.token();
        ZKTokenDistributor distributor = deployer.distributor();

        // Get private key from env
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployerAddr = vm.addr(deployerKey);

                // Get amount from CLI or SMT JSON
        uint256 mintAmount;
        try vm.envString("MINT_AMOUNT") returns (string memory amountStr) {
            if (bytes(amountStr).length > 0) {
                mintAmount = vm.parseUint(amountStr);
            } else {
                string memory json = vm.readFile("./out/smt_results.json");
                bytes memory totalAmountBytes = vm.parseJson(json, "totalAmount");
                mintAmount = vm.parseUint(string(totalAmountBytes));
            }
        } catch {
            string memory json = vm.readFile("./out/smt_results.json");
            bytes memory totalAmountBytes = vm.parseJson(json, "totalAmount");
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

        // Mint tokens to deployer
        vm.startBroadcast(deployerKey);
        token.mint(deployerAddr, mintAmount);
        // Transfer all tokens to destination
        token.transfer(destination, mintAmount);
        vm.stopBroadcast();
    }
}
