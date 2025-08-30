// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ProjectToken} from "../src/ProjectToken.sol";
import {VerifierZK} from "../src/VerifierZK.sol";
import {ZKTokenDistributor} from "../src/ZKTokenDistributor.sol";

contract Deployer {
    ProjectToken public token;
    VerifierZK public verifier;
    ZKTokenDistributor public distributor;

    constructor() {
        token = new ProjectToken();
        verifier = new VerifierZK();
        distributor = new ZKTokenDistributor(address(token), address(verifier));
    }
}
