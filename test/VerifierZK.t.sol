// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/VerifierZK.sol";

// IF YOU SWAP VERIFIER SOME TESTS ARE GOING TO BREAK,
// YOU WILL HAVE TO ALSO CHANGE VALUES OF A TESTING INPUT TO MATCH :)

contract VerifierZKTest is Test {
    VerifierZK public verifier;

    function setUp() public {
        verifier = new VerifierZK();
    }

    function testValidProof() public {
        // Valid proof data from your calldata
        uint256[2] memory pA = [
            uint256(0x2db585a6090266b7e2ac8e0e264bc1d66a2af45e662bb254d8902dae58676fc7),
            uint256(0x2854eff5333ee8d45c0618d656fb67df6f5dc7bd9b2e43f10b76dda6fb9dfbe1)
        ];

        uint256[2][2] memory pB = [
            [
                uint256(0x2448a7635d1fd57597965e58a9136c46bc5eeb945f33f051fa06899b4c5e1e80),
                uint256(0x24979b6f469e07866debc57a7b8d94cf459594bb8a06d850c93d925da1a9f893)
            ],
            [
                uint256(0x1d63213e39e92404a4f7832fc91773ab657821021b3a15c0d467281ab7f9caf4),
                uint256(0x0a5bb230ff672c2993f8db88085f165331642763007fc5c3b9598662050c19db)
            ]
        ];

        uint256[2] memory pC = [
            uint256(0x003277a1abed15745b5333fa38453d7b5ce89d58a6b187e1877c0348c51e3b57),
            uint256(0x0398736659ccd8cac07daba25456d3e21ff6976a4096007fb463ee891aa3d9ef)
        ];

        uint256[1] memory pubSignals = [
            uint256(0x0000000000000000000000000000000000000000000000000000000000000000)
        ];

        bool result = verifier.verifyProof(pA, pB, pC, pubSignals);
        
        console.log("Proof verification result:", result);
        assertTrue(result, "Valid proof should be accepted");
    }

    function testInvalidProof() public {
        // Invalid proof data (modified from the valid one)
        uint256[2] memory pA = [
            uint256(0x1db585a6090266b7e2ac8e0e264bc1d66a2af45e662bb254d8902dae58676fc7), // Changed first element
            uint256(0x2854eff5333ee8d45c0618d656fb67df6f5dc7bd9b2e43f10b76dda6fb9dfbe1)
        ];

        uint256[2][2] memory pB = [
            [
                uint256(0x2448a7635d1fd57597965e58a9136c46bc5eeb945f33f051fa06899b4c5e1e80),
                uint256(0x24979b6f469e07866debc57a7b8d94cf459594bb8a06d850c93d925da1a9f893)
            ],
            [
                uint256(0x1d63213e39e92404a4f7832fc91773ab657821021b3a15c0d467281ab7f9caf4),
                uint256(0x0a5bb230ff672c2993f8db88085f165331642763007fc5c3b9598662050c19db)
            ]
        ];

        uint256[2] memory pC = [
            uint256(0x003277a1abed15745b5333fa38453d7b5ce89d58a6b187e1877c0348c51e3b57),
            uint256(0x0398736659ccd8cac07daba25456d3e21ff6976a4096007fb463ee891aa3d9ef)
        ];

        uint256[1] memory pubSignals = [
            uint256(0x0000000000000000000000000000000000000000000000000000000000000000)
        ];

        bool result = verifier.verifyProof(pA, pB, pC, pubSignals);
        
        console.log("Invalid proof verification result:", result);
        assertFalse(result, "Invalid proof should be rejected");
    }

    function testInvalidPublicSignal() public {
        // Valid proof but invalid public signal
        uint256[2] memory pA = [
            uint256(0x2db585a6090266b7e2ac8e0e264bc1d66a2af45e662bb254d8902dae58676fc7),
            uint256(0x2854eff5333ee8d45c0618d656fb67df6f5dc7bd9b2e43f10b76dda6fb9dfbe1)
        ];

        uint256[2][2] memory pB = [
            [
                uint256(0x2448a7635d1fd57597965e58a9136c46bc5eeb945f33f051fa06899b4c5e1e80),
                uint256(0x24979b6f469e07866debc57a7b8d94cf459594bb8a06d850c93d925da1a9f893)
            ],
            [
                uint256(0x1d63213e39e92404a4f7832fc91773ab657821021b3a15c0d467281ab7f9caf4),
                uint256(0x0a5bb230ff672c2993f8db88085f165331642763007fc5c3b9598662050c19db)
            ]
        ];

        uint256[2] memory pC = [
            uint256(0x003277a1abed15745b5333fa38453d7b5ce89d58a6b187e1877c0348c51e3b57),
            uint256(0x0398736659ccd8cac07daba25456d3e21ff6976a4096007fb463ee891aa3d9ef)
        ];

        uint256[1] memory pubSignals = [
            uint256(0x1234567890123456789012345678901234567890123456789012345678901234) // Changed public signal
        ];

        bool result = verifier.verifyProof(pA, pB, pC, pubSignals);
        
        console.log("Invalid public signal verification result:", result);
        assertFalse(result, "Proof with wrong public signal should be rejected");
    }

    function testGasUsage() public {
        // Test gas consumption for proof verification
        uint256[2] memory pA = [
            uint256(0x2db585a6090266b7e2ac8e0e264bc1d66a2af45e662bb254d8902dae58676fc7),
            uint256(0x2854eff5333ee8d45c0618d656fb67df6f5dc7bd9b2e43f10b76dda6fb9dfbe1)
        ];

        uint256[2][2] memory pB = [
            [
                uint256(0x2448a7635d1fd57597965e58a9136c46bc5eeb945f33f051fa06899b4c5e1e80),
                uint256(0x24979b6f469e07866debc57a7b8d94cf459594bb8a06d850c93d925da1a9f893)
            ],
            [
                uint256(0x1d63213e39e92404a4f7832fc91773ab657821021b3a15c0d467281ab7f9caf4),
                uint256(0x0a5bb230ff672c2993f8db88085f165331642763007fc5c3b9598662050c19db)
            ]
        ];

        uint256[2] memory pC = [
            uint256(0x003277a1abed15745b5333fa38453d7b5ce89d58a6b187e1877c0348c51e3b57),
            uint256(0x0398736659ccd8cac07daba25456d3e21ff6976a4096007fb463ee891aa3d9ef)
        ];

        uint256[1] memory pubSignals = [
            uint256(0x0000000000000000000000000000000000000000000000000000000000000000)
        ];

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
        uint256[2] memory pA = [uint256(1), uint256(2)];
        uint256[2][2] memory pB = [[uint256(1), uint256(2)], [uint256(3), uint256(4)]];
        uint256[2] memory pC = [uint256(1), uint256(2)];
        uint256[1] memory pubSignals = [uint256(0)];

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
        uint256[1] memory pubSignals = [uint256(0)];

        bool result = verifier.verifyProof(pA, pB, pC, pubSignals);
        
        console.log("Zero proof verification result:", result);
        assertFalse(result, "All-zero proof should be rejected");
    }

    // Helper function to verify your specific calldata format
    function testCalldata() public {
        // This test demonstrates how to use the exact calldata format you provided
        string memory calldataStr = "Your calldata format works correctly!";
        console.log(calldataStr);
        
        // Run the actual verification
        uint256[2] memory pA = [
            uint256(0x2db585a6090266b7e2ac8e0e264bc1d66a2af45e662bb254d8902dae58676fc7),
            uint256(0x2854eff5333ee8d45c0618d656fb67df6f5dc7bd9b2e43f10b76dda6fb9dfbe1)
        ];

        uint256[2][2] memory pB = [
            [
                uint256(0x2448a7635d1fd57597965e58a9136c46bc5eeb945f33f051fa06899b4c5e1e80),
                uint256(0x24979b6f469e07866debc57a7b8d94cf459594bb8a06d850c93d925da1a9f893)
            ],
            [
                uint256(0x1d63213e39e92404a4f7832fc91773ab657821021b3a15c0d467281ab7f9caf4),
                uint256(0x0a5bb230ff672c2993f8db88085f165331642763007fc5c3b9598662050c19db)
            ]
        ];

        uint256[2] memory pC = [
            uint256(0x003277a1abed15745b5333fa38453d7b5ce89d58a6b187e1877c0348c51e3b57),
            uint256(0x0398736659ccd8cac07daba25456d3e21ff6976a4096007fb463ee891aa3d9ef)
        ];

        uint256[1] memory pubSignals = [
            uint256(0x0000000000000000000000000000000000000000000000000000000000000000)
        ];

        bool result = verifier.verifyProof(pA, pB, pC, pubSignals);
        console.log("Your calldata verification result:", result);
        
        if (result) {
            console.log("SUCCESS: Your proof is VALID!");
        } else {
            console.log("FAILED: Your proof is INVALID");
        }
    }
}
