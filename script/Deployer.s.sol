// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ProjectToken} from "../src/ProjectToken.sol";
import {ZKVerifier} from "../src/ZKVerifier.sol";
import {ZKTokenDistributor} from "../src/ZKTokenDistributor.sol";

contract Deployer {
    ProjectToken public token;
    ZKVerifier public verifier;
    ZKTokenDistributor public distributor;

    constructor() {
        token = new ProjectToken();
        verifier = new ZKVerifier();
        distributor = new ZKTokenDistributor(address(token), address(verifier));
    }
}
