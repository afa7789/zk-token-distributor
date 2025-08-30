// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import {ZKAirDroppedToken} from "../src/ProjectToken.sol";
import {VerifierZK} from "../src/VerifierZK.sol";
import {ZKTokenDistributor} from "../src/ZKTokenDistributor.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployerScript is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy token
        ZKAirDroppedToken token = new ZKAirDroppedToken("ZK Token", "ZKT", msg.sender);
        console.log("Token deployed at:", address(token));

        // Deploy verifier
        VerifierZK verifier = new VerifierZK();
        console.log("Verifier deployed at:", address(verifier));

        // Deploy distributor
        bytes32 dummyRoot = keccak256("dummy root");
        uint256 totalClaimable = 1000000 * 10**18; // 1M tokens
        uint256 claimStart = block.timestamp + 1 days;
        uint256 claimEnd = claimStart + 30 days;
        
        ZKTokenDistributor distributor = new ZKTokenDistributor(
            dummyRoot, 
            IERC20(address(token)), 
            address(verifier), 
            totalClaimable, 
            claimStart, 
            claimEnd
        );
        console.log("Distributor deployed at:", address(distributor));

        vm.stopBroadcast();
    }
}
