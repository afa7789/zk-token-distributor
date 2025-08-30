// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ZKAirDroppedToken} from "../src/ProjectToken.sol";
import {VerifierZK} from "../src/VerifierZK.sol";
import {ZKTokenDistributor} from "../src/ZKTokenDistributor.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Deployer {
    ZKAirDroppedToken public token;
    VerifierZK public verifier;
    ZKTokenDistributor public distributor;

    constructor() {
        token = new ZKAirDroppedToken("ZK Token", "ZKT", msg.sender);
        verifier = new VerifierZK();
        // For demo purposes, using dummy values. In production, these should be configured properly.
        bytes32 dummyRoot = keccak256("dummy root");
        uint256 totalClaimable = 1000000 * 10**18; // 1M tokens
        uint256 claimStart = block.timestamp + 1 days;
        uint256 claimEnd = claimStart + 30 days;
        distributor = new ZKTokenDistributor(dummyRoot, IERC20(address(token)), address(verifier), totalClaimable, claimStart, claimEnd);
    }
}
