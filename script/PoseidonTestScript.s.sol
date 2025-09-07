// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

contract PoseidonTestScript is Script {
    function run() public {
        console.log("=== Testing Poseidon Implementation ===\n");

        // Test 1: Basic hash with zeros
        console.log("Test 1: hash1(0, 0)");
        bytes32 result1 = testPoseidon3("0", "0", "hash1");
        console.log("Result:", vm.toString(uint256(result1)));
        console.log("Expected: Should be a large number (20+ digits)\n");

        // Test 2: Basic hash with small numbers
        console.log("Test 2: hash1(1, 100)");
        bytes32 result2 = testPoseidon3("1", "100", "hash1");
        console.log("Result:", vm.toString(uint256(result2)));
        console.log("Expected: Should be a large number (20+ digits)\n");

        // Test 3: hash0 (internal nodes)
        console.log("Test 3: hash0(0, 0)");
        bytes32 result3 = testPoseidon3("0", "0", "hash0");
        console.log("Result:", vm.toString(uint256(result3)));
        console.log("Expected: Should be a large number (20+ digits)\n");

        // Test 4: Check if scripts are even running
        console.log("Test 4: Testing if external scripts run correctly");
        console.log("If all results above are small numbers (< 1000000), your Poseidon scripts are broken");

        // Test 5: Raw FFI output
        console.log("\nTest 5: Raw FFI output inspection");
        string[] memory args = new string[](5);
        args[0] = "bun";
        args[1] = "script/poseidon3.js";
        args[2] = "1";
        args[3] = "100";
        args[4] = "hash1";

        bytes memory rawOutput = vm.ffi(args);
        console.log("Raw FFI output length:", rawOutput.length);
        console.log("Raw FFI as string:", string(rawOutput));

        // Test if the issue is in parsing
        uint256 parsed = parseUintFromBytes(rawOutput);
        console.log("Parsed value:", parsed);
    }

    function testPoseidon3(string memory a, string memory b, string memory hashType) internal returns (bytes32) {
        string[] memory args = new string[](5);
        args[0] = "bun";
        args[1] = "script/poseidon3.js";
        args[2] = a;
        args[3] = b;
        args[4] = hashType;

        bytes memory out = vm.ffi(args);
        return parseBytes32String(out);
    }

    function parseUintFromBytes(bytes memory b) internal pure returns (uint256) {
        uint256 res = 0;
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 char = b[i];
            if (char >= 0x30 && char <= 0x39) {
                res = res * 10 + (uint8(char) - 48);
            }
        }
        return res;
    }

    function parseBytes32String(bytes memory b) internal pure returns (bytes32) {
        uint256 val = parseUintFromBytes(b);
        return bytes32(val);
    }
}
