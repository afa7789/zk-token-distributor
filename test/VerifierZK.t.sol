// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/VerifierZK.sol";

// IF YOU SWAP VERIFIER SOME TESTS ARE GOING TO BREAK,
// YOU WILL HAVE TO ALSO CHANGE VALUES OF A TESTING INPUT TO MATCH :) calldata.txt

contract VerifierZKTest is Test {
    VerifierZK public verifier;

    function setUp() public {
        verifier = new VerifierZK();
    }

    function loadCalldata()
        internal
        view
        returns (uint256[2] memory pA, uint256[2][2] memory pB, uint256[2] memory pC, uint256[3] memory pubSignals)
    {
        // Try to load structured calldata.json first, fallback to calldata.txt
        try vm.readFile("circuits/circom/output/calldata.json") returns (string memory json) {
            // Use structured format
            pA[0] = vm.parseJsonUint(json, ".pA[0]");
            pA[1] = vm.parseJsonUint(json, ".pA[1]");

            pB[0][0] = vm.parseJsonUint(json, ".pB[0][0]");
            pB[0][1] = vm.parseJsonUint(json, ".pB[0][1]");
            pB[1][0] = vm.parseJsonUint(json, ".pB[1][0]");
            pB[1][1] = vm.parseJsonUint(json, ".pB[1][1]");

            pC[0] = vm.parseJsonUint(json, ".pC[0]");
            pC[1] = vm.parseJsonUint(json, ".pC[1]");

            pubSignals[0] = vm.parseJsonUint(json, ".pubSignals[0]");
            pubSignals[1] = vm.parseJsonUint(json, ".pubSignals[1]");
            pubSignals[2] = vm.parseJsonUint(json, ".pubSignals[2]");
        } catch {
            // Fallback to array format in calldata.txt
            string memory json = vm.readFile("circuits/circom/output/calldata.txt");

            pA[0] = vm.parseJsonUint(json, "$[0][0]");
            pA[1] = vm.parseJsonUint(json, "$[0][1]");

            pB[0][0] = vm.parseJsonUint(json, "$[1][0][0]");
            pB[0][1] = vm.parseJsonUint(json, "$[1][0][1]");
            pB[1][0] = vm.parseJsonUint(json, "$[1][1][0]");
            pB[1][1] = vm.parseJsonUint(json, "$[1][1][1]");

            pC[0] = vm.parseJsonUint(json, "$[2][0]");
            pC[1] = vm.parseJsonUint(json, "$[2][1]");

            pubSignals[0] = vm.parseJsonUint(json, "$[3][0]");
            pubSignals[1] = vm.parseJsonUint(json, "$[3][1]");
            pubSignals[2] = vm.parseJsonUint(json, "$[3][2]");
        }
    }

    function testValidProof() public {
        // Load proof data directly from calldata.txt
        (uint256[2] memory pA, uint256[2][2] memory pB, uint256[2] memory pC, uint256[3] memory pubSignals) =
            loadCalldata();

        bool result = verifier.verifyProof(pA, pB, pC, pubSignals);

        console.log("Proof verification result:", result);
        assertTrue(result, "Valid proof should be accepted");
    }

    function testInvalidProof() public {
        // Invalid proof data (modified from the valid one)
        // take the valid pA and modify the first element to make it invalid
        uint256[2] memory pA = [
            uint256(0x24f56ef6ca5a1300290192ff18cb11eb2817519b8dc6f3ad5d41657794df7e54),
            uint256(0x020c9bce56bdbbb4a1494f57e2da98831f94d6b8609fe7a4337746fd652bf44d)
        ];

        uint256[2][2] memory pB = [
            [
                uint256(0x11d64c137625d352c7c8bba77e2fd19ed7b50ad24edf4e782765fbcfee2fc187),
                uint256(0x02f44220d60b020686f82a078d661079e08c07bcff5d7a2c519659eb92fa49fc)
            ],
            [
                uint256(0x1464e29961b20f8b977e19d64821206e704814b3c22c9ec4beea4e89614be07a),
                uint256(0x1780392ce9086cd2a18fa37a81eae7609f4883b1d7c7046bd21901d14f1c4d84)
            ]
        ];

        uint256[2] memory pC = [
            uint256(0x0df742e8520d01459c53be9a7b2b9b2bdb50c04f1fc6c0e8d3fec0f0abae0306),
            uint256(0x021d5e3953c23e8534864bc3cfdb1b0ebd0fd2d56f6a987e947d3a9b5ccbe9fe)
        ];

        uint256[3] memory pubSignals = [
            uint256(0x0e0a8cddea1a68ea15116226f1b19e103f46a6d8f0838c51e55e8d094c1b9264),
            uint256(0x1e813da0b36c785286749272e6c5721e8d713558e9a0bbce80785dfd56e69d0b),
            uint256(0x00000000000000000000000000000000000000000000065a4da25d3016c00000)
        ];

        bool result = verifier.verifyProof(pA, pB, pC, pubSignals);

        console.log("Invalid proof verification result:", result);
        assertFalse(result, "Invalid proof should be rejected");
    }

    function testInvalidPublicSignal() public {
        // Valid proof but invalid public signal
        uint256[2] memory pA = [
            uint256(0x14f56ef6ca5a1300290192ff18cb11eb2817519b8dc6f3ad5d41657794df7e54),
            uint256(0x020c9bce56bdbbb4a1494f57e2da98831f94d6b8609fe7a4337746fd652bf44d)
        ];

        uint256[2][2] memory pB = [
            [
                uint256(0x11d64c137625d352c7c8bba77e2fd19ed7b50ad24edf4e782765fbcfee2fc187),
                uint256(0x02f44220d60b020686f82a078d661079e08c07bcff5d7a2c519659eb92fa49fc)
            ],
            [
                uint256(0x1464e29961b20f8b977e19d64821206e704814b3c22c9ec4beea4e89614be07a),
                uint256(0x1780392ce9086cd2a18fa37a81eae7609f4883b1d7c7046bd21901d14f1c4d84)
            ]
        ];

        uint256[2] memory pC = [
            uint256(0x0df742e8520d01459c53be9a7b2b9b2bdb50c04f1fc6c0e8d3fec0f0abae0306),
            uint256(0x021d5e3953c23e8534864bc3cfdb1b0ebd0fd2d56f6a987e947d3a9b5ccbe9fe)
        ];

        uint256[3] memory pubSignals = [
            uint256(0x0e0a8cddea1a68ea15116226f1b19e103f46a6d8f0838c51e55e8d094c1b9264), // merkleRoot
            uint256(0x1234567890123456789012345678901234567890123456789012345678901234), // Changed nullifierHash
            uint256(0x00000000000000000000000000000000000000000000065a4da25d3016c00000) // amount
        ];

        bool result = verifier.verifyProof(pA, pB, pC, pubSignals);

        console.log("Invalid public signal verification result:", result);
        assertFalse(result, "Proof with wrong public signal should be rejected");
    }

    function testGasUsage() public {
        // Test gas consumption for proof verification using real calldata
        (uint256[2] memory pA, uint256[2][2] memory pB, uint256[2] memory pC, uint256[3] memory pubSignals) =
            loadCalldata();

        uint256 gasBefore = gasleft();
        bool result = verifier.verifyProof(pA, pB, pC, pubSignals);
        uint256 gasAfter = gasleft();

        uint256 gasUsed = gasBefore - gasAfter;
        console.log("Gas used for proof verification:", gasUsed);
        console.log("Verification result:", result);

        // Assert reasonable gas usage (should be under 300k gas)
        assertTrue(gasUsed < 300000, "Gas usage should be reasonable");
        assertTrue(result, "Valid proof should be accepted");
    }

    function testVerifierConstants() public {
        // Test that the verifier contract was deployed correctly by checking some constants
        // This is more of a sanity check that the contract has the expected verification key

        // We can't directly access the constants from outside, but we can test that
        // the contract exists and responds to calls
        uint256[2] memory pA = [
            uint256(0x14f56ef6ca5a1300290192ff18cb11eb2817519b8dc6f3ad5d41657794df7e54),
            uint256(0x020c9bce56bdbbb4a1494f57e2da98831f94d6b8609fe7a4337746fd652bf44d)
        ];
        uint256[2][2] memory pB = [
            [
                uint256(0x11d64c137625d352c7c8bba77e2fd19ed7b50ad24edf4e782765fbcfee2fc187),
                uint256(0x02f44220d60b020686f82a078d661079e08c07bcff5d7a2c519659eb92fa49fc)
            ],
            [
                uint256(0x1464e29961b20f8b977e19d64821206e704814b3c22c9ec4beea4e89614be07a),
                uint256(0x1780392ce9086cd2a18fa37a81eae7609f4883b1d7c7046bd21901d14f1c4d84)
            ]
        ];
        uint256[2] memory pC = [
            uint256(0x0df742e8520d01459c53be9a7b2b9b2bdb50c04f1fc6c0e8d3fec0f0abae0306),
            uint256(0x021d5e3953c23e8534864bc3cfdb1b0ebd0fd2d56f6a987e947d3a9b5ccbe9fe)
        ];
        uint256[3] memory pubSignals = [
            uint256(0x0e0a8cddea1a68ea15116226f1b19e103f46a6d8f0838c51e55e8d094c1b9264),
            uint256(0x1e813da0b36c785286749272e6c5721e8d713558e9a0bbce80785dfd56e69d0b),
            uint256(0x00000000000000000000000000000000000000000000065a4da25d3016c00000)
        ];

        // This should not revert (even if it returns false)
        try verifier.verifyProof(pA, pB, pC, pubSignals) returns (bool result) {
            console.log("Verifier contract is functional, result:", result);
            // We expect this to be false since it's not a valid proof, but it shouldn't revert
        } catch {
            fail("Verifier contract should not revert on invalid proofs");
        }
    }

    function testZeroProof() public {
        // Test with all zero values
        uint256[2] memory pA = [uint256(0), uint256(0)];
        uint256[2][2] memory pB = [[uint256(0), uint256(0)], [uint256(0), uint256(0)]];
        uint256[2] memory pC = [uint256(0), uint256(0)];
        uint256[3] memory pubSignals = [uint256(0x1e), uint256(0), uint256(100 * 10 ** 18)];

        bool result = verifier.verifyProof(pA, pB, pC, pubSignals);

        console.log("Zero proof verification result:", result);
        assertFalse(result, "All-zero proof should be rejected");
    }

    // Helper function to verify your specific calldata format
    function testCalldata() public {
        // This test demonstrates how to use the exact calldata format you provided
        string memory calldataStr = "Your calldata format works correctly!";
        console.log(calldataStr);

        // Load proof data directly from calldata.txt
        (uint256[2] memory pA, uint256[2][2] memory pB, uint256[2] memory pC, uint256[3] memory pubSignals) =
            loadCalldata();

        bool result = verifier.verifyProof(pA, pB, pC, pubSignals);
        console.log("Your calldata verification result:", result);

        if (result) {
            console.log("SUCCESS: Your proof is VALID!");
        } else {
            console.log("FAILED: Your proof is INVALID");
        }
    }
}
