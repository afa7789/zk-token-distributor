// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

contract ZeroHashTestScript is Script {
    
    function run() public {
        console.log("=== Investigating Zero Hash Issue ===\n");
        
        // Test various combinations with zeros
        console.log("hash1(0, 0):");
        bytes32 result1 = testPoseidon3("0", "0", "hash1");
        console.log("Result:", vm.toString(uint256(result1)));
        
        console.log("\nhash1(0, 1):");
        bytes32 result2 = testPoseidon3("0", "1", "hash1");
        console.log("Result:", vm.toString(uint256(result2)));
        
        console.log("\nhash1(1, 0):");
        bytes32 result3 = testPoseidon3("1", "0", "hash1");
        console.log("Result:", vm.toString(uint256(result3)));
        
        console.log("\nhash0(0, 0):");
        bytes32 result4 = testPoseidon3("0", "0", "hash0");
        console.log("Result:", vm.toString(uint256(result4)));
        
        // Test what happens when we build a tree with problematic values
        console.log("\n=== Building Mini SMT with Zero Issue ===");
        
        // Simulate: key=0, value=0 (if this exists in your data)
        bytes32 badLeafHash = testPoseidon3("0", "0", "hash1");
        console.log("Bad leaf hash (0,0):", vm.toString(uint256(badLeafHash)));
        
        // Level 1: left=badLeafHash, right=0
        bytes32 level1Hash = testPoseidon3(vm.toString(uint256(badLeafHash)), "0", "hash0");
        console.log("Level 1 hash:", vm.toString(uint256(level1Hash)));
        
        // This could explain your small root!
        
        // Now test with proper values
        console.log("\n=== Building Mini SMT with Good Values ===");
        bytes32 goodLeafHash = testPoseidon3("1", "100", "hash1");
        console.log("Good leaf hash (1,100):", vm.toString(uint256(goodLeafHash)));
        
        bytes32 goodLevel1Hash = testPoseidon3(vm.toString(uint256(goodLeafHash)), "0", "hash0");
        console.log("Good Level 1 hash:", vm.toString(uint256(goodLevel1Hash)));
    }
    
    function testPoseidon3(string memory a, string memory b, string memory hashType) 
        internal returns (bytes32) {
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