// import "forge-std/Script.sol";
import "poseidon-solidity/PoseidonT2.sol"; // Use T2 for two-input hashes
import "poseidon-solidity/PoseidonT3.sol"; // Use T3 for two-input nullifier hash
import "poseidon-solidity/PoseidonT4.sol"; // Use T4 for three-input hashes (leaf and node)X-License-Identifier: MIT

pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "poseidon-solidity/PoseidonT3.sol"; // Use T2 for two-input hashes
import "poseidon-solidity/PoseidonT2.sol"; // Use T2 for two-input hashes
import "poseidon-solidity/PoseidonT4.sol"; // Use T4 for three-input hashes

/**
 * @title SMT Generator Script
 * @dev Generates a Sparse Merkle Tree compatible with Circom circuits
 *
 * SMT Key Differences:
 * - Fixed height (e.g., 20 levels)
 * - Keys determine position in tree (not insertion order)
 * - Empty subtrees have value 0
 * - Path is determined by key bits
 */
contract SMTGeneratorScript is Script {
    struct LeafData {
        address account; // This becomes the KEY in SMT
        uint256 amount; // This becomes the VALUE in SMT
    }

    struct SMTNode {
        bytes32 left;
        bytes32 right;
    }

    // SMT Configuration
    uint256 constant TREE_LEVELS = 5; // Must match your Circom circuit
    bytes32 constant EMPTY_NODE_HASH = bytes32(0);

    // Storage for the SMT
    mapping(bytes32 => SMTNode) private nodes;
    bytes32 private root;

    function run() public {
        console.log("\n--- Sparse Merkle Tree Generator ---");
        console.log("Tree Levels:", TREE_LEVELS);

        // Read and parse CSV
        string memory csvPath = "./data/addresses.csv";
        string memory csvContent = vm.readFile(csvPath);
        LeafData[] memory leafData = parseCSV(csvContent);

        console.log("Parsed", leafData.length, "entries from CSV");

        // Initialize empty SMT
        initializeSMT();

        // Insert all leaf data into SMT
        for (uint256 i = 0; i < leafData.length; i++) {
            insertIntoSMT(leafData[i].account, leafData[i].amount);

            // Only show first 3 insertions to avoid log spam
            if (i < 3) {
                console.log("Inserted:", vm.toString(leafData[i].account), "->", vm.toString(leafData[i].amount));
            } else if (i == 3) {
                console.log("... and", leafData.length - 3, "more entries inserted");
            }
        }

        console.log("\n--- SMT Root ---");
        console.logBytes32(root);

        // Generate inclusion proofs and nullifiers for all leaves
        console.log("\n--- Generating SMT Inclusion Proofs with Nullifiers ---");

        // Create arrays to store all proof data
        bytes32[][] memory allProofs = new bytes32[][](leafData.length);
        bytes32[] memory nullifierHashes = new bytes32[](leafData.length);
        uint256[] memory nullifiers = new uint256[](leafData.length);

        for (uint256 i = 0; i < leafData.length; i++) {
            bytes32[] memory proof = generateInclusionProof(leafData[i].account);
            allProofs[i] = proof;

            // Generate a nullifier for this user (in practice, user chooses this secretly)
            uint256 nullifier = uint256(keccak256(abi.encodePacked(leafData[i].account, "secret", i)));
            nullifiers[i] = nullifier;

            // Calculate nullifier hash using external node poseidon2 (matches your circom/test harness)
            // NOTE: the on-chain Poseidon implementation produced a different value in earlier tests.
            // We keep the old implementation available as computeNullifierHash_OLD for reference.
            bytes32 nullifierHash = computeNullifierHash(uint256(uint160(leafData[i].account)), nullifier);
            nullifierHashes[i] = nullifierHash;

            // Verify the SMT proof
            bool isValid = verifyInclusionProof(leafData[i].account, leafData[i].amount, proof, root);

            // Only show first 3 proofs to avoid log spam
            if (i < 3) {
                console.log(
                    string.concat(
                        "SMT Proof for ",
                        vm.toString(leafData[i].account),
                        " (amount ",
                        vm.toString(leafData[i].amount),
                        ") is valid: ",
                        vm.toString(isValid)
                    )
                );

                console.log("  Nullifier:", vm.toString(nullifier));
                console.log("  NullifierHash:", vm.toString(nullifierHash));
            } else if (i == 3) {
                console.log("... and", leafData.length - 3, "more proofs generated and verified");
            }
        }

        // Generate some non-inclusion proofs for demonstration
        console.log("\n--- Generating SMT Non-Inclusion Proofs ---");

        // Test with some random addresses that weren't inserted
        address[] memory testAddresses = new address[](3);
        testAddresses[0] = address(0x1234567890123456789012345678901234567890);
        testAddresses[1] = address(0x9234567890123456789012345678901234567890);
        testAddresses[2] = address(0x9999999999999999999999999999999999999999);

        for (uint256 i = 0; i < testAddresses.length; i++) {
            bytes32[] memory nonInclusionProof = generateNonInclusionProof(testAddresses[i]);

            bool isNonIncluded = verifyNonInclusionProof(testAddresses[i], nonInclusionProof, root);

            console.log(
                string.concat(
                    "Non-inclusion proof for ", vm.toString(testAddresses[i]), " is valid: ", vm.toString(isNonIncluded)
                )
            );
        }

        // Write results to file including nullifiers
        writeSMTResultsToFile(root, leafData, allProofs, nullifiers, nullifierHashes);
        writeCircomInputsToFile(root, leafData, allProofs, nullifiers, nullifierHashes);
        console.log("\n--- SMT results with nullifiers written to ./out/smt_results.json ---");
        console.log("\n--- Circom Inputs are written to ./out/circom_inputs.json ---");
    }

    /**
     * @dev Initialize empty SMT with all nodes set to 0
     */
    function initializeSMT() internal {
        root = EMPTY_NODE_HASH;
    }

    /**
     * @dev Insert a key-value pair into the SMT
     */
    function insertIntoSMT(address key, uint256 value) internal {
        uint256 keyUint = uint256(uint160(key));
        bytes32 leafHash = calculateLeafHash(keyUint, value);

        root = insertRecursive(root, keyUint, leafHash, TREE_LEVELS);
    }

    /**
     * @dev Recursive function to insert into SMT
     */
    function insertRecursive(bytes32 nodeHash, uint256 key, bytes32 leafHash, uint256 level)
        internal
        returns (bytes32)
    {
        if (level == 0) {
            // We're at a leaf level
            return leafHash;
        }

        // Get the bit at this level (MSB first)
        uint256 bitIndex = level - 1;
        bool goRight = (key >> bitIndex) & 1 == 1;

        SMTNode memory node;
        if (nodeHash != EMPTY_NODE_HASH) {
            node = nodes[nodeHash];
        } else {
            // Empty node
            node = SMTNode(EMPTY_NODE_HASH, EMPTY_NODE_HASH);
        }

        if (goRight) {
            node.right = insertRecursive(node.right, key, leafHash, level - 1);
        } else {
            node.left = insertRecursive(node.left, key, leafHash, level - 1);
        }

        // Calculate new node hash
        bytes32 newNodeHash = hashNode(node.left, node.right);
        nodes[newNodeHash] = node;

        return newNodeHash;
    }

    /**
     * @dev Generate inclusion proof for a key
     */
    function generateInclusionProof(address key) internal view returns (bytes32[] memory) {
        bytes32[] memory proof = new bytes32[](TREE_LEVELS);
        uint256 keyUint = uint256(uint160(key));

        bytes32 currentHash = root;

        for (uint256 i = 0; i < TREE_LEVELS; i++) {
            uint256 bitIndex = TREE_LEVELS - 1 - i;
            bool goRight = (keyUint >> bitIndex) & 1 == 1;

            if (currentHash == EMPTY_NODE_HASH) {
                proof[i] = EMPTY_NODE_HASH;
            } else {
                SMTNode memory node = nodes[currentHash];
                if (goRight) {
                    proof[i] = node.left; // Sibling is left
                    currentHash = node.right;
                } else {
                    proof[i] = node.right; // Sibling is right
                    currentHash = node.left;
                }
            }
        }

        return proof;
    }

    /**
     * @dev Generate non-inclusion proof for a key (simplified)
     */
    function generateNonInclusionProof(address key) internal view returns (bytes32[] memory) {
        // For this demo, non-inclusion proof is same format as inclusion
        // In practice, you might need additional logic to handle edge cases
        return generateInclusionProof(key);
    }

    /**
     * @dev Verify inclusion proof
     */
    function verifyInclusionProof(address key, uint256 value, bytes32[] memory proof, bytes32 expectedRoot)
        internal
        returns (bool)
    {
        uint256 keyUint = uint256(uint160(key));
        bytes32 computedHash = calculateLeafHash(keyUint, value);

        for (uint256 i = 0; i < proof.length; i++) {
            uint256 bitIndex = TREE_LEVELS - 1 - i;
            bool goRight = (keyUint >> bitIndex) & 1 == 1;

            if (goRight) {
                computedHash = hashNode(proof[i], computedHash);
            } else {
                computedHash = hashNode(computedHash, proof[i]);
            }
        }

        return computedHash == expectedRoot;
    }

    /**
     * @dev Verify non-inclusion proof (simplified)
     */
    function verifyNonInclusionProof(address key, bytes32[] memory proof, bytes32 expectedRoot)
        internal
        returns (bool)
    {
        uint256 keyUint = uint256(uint160(key));
        bytes32 computedHash = EMPTY_NODE_HASH; // Start with empty leaf

        for (uint256 i = 0; i < proof.length; i++) {
            uint256 bitIndex = TREE_LEVELS - 1 - i;
            bool goRight = (keyUint >> bitIndex) & 1 == 1;

            if (goRight) {
                computedHash = hashNode(proof[i], computedHash);
            } else {
                computedHash = hashNode(computedHash, proof[i]);
            }
        }

        return computedHash == expectedRoot;
    }

    /**
     * @dev Calculate leaf hash using Poseidon (matches Circom SMTHash1)
     * SMTHash1 in circomlib uses PoseidonT4 with (key, value, 1)
     * The 1 is domain separation to indicate this is a leaf hash
     */
    // OLD: on-chain Poseidon (kept for reference)
    function calculateLeafHash_OLD(uint256 key, uint256 value) internal pure returns (bytes32) {
        // SMTHash1: Poseidon(key, value, 1) - 1 indicates leaf
        return bytes32(PoseidonT4.hash([key, value, 1]));
    }

    // New: call external node script (bun) that uses poseidon-lite to compute the same value
    function calculateLeafHash(uint256 key, uint256 value) internal returns (bytes32) {
        console.log("Disclaimer: using external node poseidon2/3; on-chain Poseidon produced different results in earlier tests.");
    string[] memory input = new string[](5);
    input[0] = "bun";
    input[1] = "poseidon3.js";
    input[2] = vm.toString(key);
    input[3] = vm.toString(value);
    input[4] = "1";

    bytes memory result = vm.ffi(input);
        // result is ASCII bytes of decimal number
        uint256 val = parseUintFromBytes(result);
        return bytes32(bytes32(uint256(val)));
    }

    /**
     * @dev Hash two child nodes using Poseidon (matches Circom SMTHash2)
     * SMTHash2 in circomlib uses PoseidonT4 with (left, right, 0)
     * The 0 is domain separation to indicate this is an internal node hash
     */
    // OLD: on-chain Poseidon
    function hashNode_OLD(bytes32 left, bytes32 right) internal pure returns (bytes32) {
        // SMTHash2: Poseidon(left, right, 0) - 0 indicates internal node
        return bytes32(PoseidonT4.hash([uint256(left), uint256(right), 0]));
    }

    // New: call node poseidon3 wrapper to compute hash(left, right, 0)
    function hashNode(bytes32 left, bytes32 right) internal returns (bytes32) {
        console.log("Disclaimer: using external node poseidon3; on-chain Poseidon produced different results in earlier tests.");
    string[] memory input = new string[](5);
    input[0] = "bun";
    input[1] = "./scripts/poseidon3.js";
    input[2] = vm.toString(uint256(left));
    input[3] = vm.toString(uint256(right));
    input[4] = "0";

    bytes memory result = vm.ffi(input);
        uint256 val = parseUintFromBytes(result);
        return bytes32(bytes32(uint256(val)));
    }

    // OLD nullifier hash for reference
    function computeNullifierHash_OLD(uint256 userAddress, uint256 nullifier) internal pure returns (bytes32) {
        return bytes32(PoseidonT3.hash([userAddress, nullifier]));
    }

    // New: compute nullifier hash via external node poseidon2 wrapper
    function computeNullifierHash(uint256 userAddress, uint256 nullifier) internal returns (bytes32) {
        console.log("Disclaimer: using external node poseidon2; on-chain Poseidon produced different results in earlier tests.");
        string[] memory input = new string[](4);
        input[0] = "bun";
        input[1] = "poseidon2.js";
        input[2] = vm.toString(userAddress);
        input[3] = vm.toString(nullifier);

        bytes memory result = vm.ffi(input);
        uint256 val = parseUintFromBytes(result);
        return bytes32(bytes32(uint256(val)));
    }

    // Helper to parse ASCII decimal bytes returned by node script to uint256
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

    // Utility functions (same as before)
    function parseCSV(string memory csvContent) internal pure returns (LeafData[] memory) {
        string[] memory lines = splitString(csvContent, "\n");
        uint256 dataRows = lines.length - 1;
        if (dataRows == 0) revert("CSV file has no data rows");

        LeafData[] memory data = new LeafData[](dataRows);
        for (uint256 i = 1; i <= dataRows; i++) {
            string memory line = lines[i];
            if (bytes(line).length == 0) continue;

            string[] memory fields = splitString(line, ",");
            if (fields.length < 2) revert(string.concat("Invalid CSV line: ", line));

            address account = parseAddress(fields[0]);
            uint256 amount = parseUint(fields[1]);
            data[i - 1] = LeafData({account: account, amount: amount});
        }
        return data;
    }

    function splitString(string memory str, bytes1 delimiter) internal pure returns (string[] memory) {
        bytes memory strBytes = bytes(str);
        uint256 delimiterCount = 0;

        for (uint256 i = 0; i < strBytes.length; i++) {
            if (strBytes[i] == delimiter) delimiterCount++;
        }

        string[] memory parts = new string[](delimiterCount + 1);
        uint256 partIndex = 0;
        uint256 startIndex = 0;

        for (uint256 i = 0; i <= strBytes.length; i++) {
            if (i == strBytes.length || strBytes[i] == delimiter) {
                bytes memory part = new bytes(i - startIndex);
                for (uint256 j = 0; j < i - startIndex; j++) {
                    part[j] = strBytes[startIndex + j];
                }
                parts[partIndex] = string(part);
                partIndex++;
                startIndex = i + 1;
            }
        }
        return parts;
    }

    function parseAddress(string memory str) internal pure returns (address) {
        bytes memory strBytes = bytes(str);
        bytes memory trimmed = new bytes(strBytes.length);
        uint256 trimmedLength = 0;

        for (uint256 i = 0; i < strBytes.length; i++) {
            if (strBytes[i] != 0x20 && strBytes[i] != 0x09 && strBytes[i] != 0x0a && strBytes[i] != 0x0d) {
                trimmed[trimmedLength] = strBytes[i];
                trimmedLength++;
            }
        }

        bytes memory finalBytes = new bytes(trimmedLength);
        for (uint256 i = 0; i < trimmedLength; i++) {
            finalBytes[i] = trimmed[i];
        }
        return vm.parseAddress(string(finalBytes));
    }

    function parseUint(string memory str) internal pure returns (uint256) {
        bytes memory strBytes = bytes(str);
        bytes memory trimmed = new bytes(strBytes.length);
        uint256 trimmedLength = 0;

        for (uint256 i = 0; i < strBytes.length; i++) {
            if (strBytes[i] != 0x20 && strBytes[i] != 0x09 && strBytes[i] != 0x0a && strBytes[i] != 0x0d) {
                trimmed[trimmedLength] = strBytes[i];
                trimmedLength++;
            }
        }

        bytes memory finalBytes = new bytes(trimmedLength);
        for (uint256 i = 0; i < trimmedLength; i++) {
            finalBytes[i] = trimmed[i];
        }
        return vm.parseUint(string(finalBytes));
    }

    function writeSMTResultsToFile(
        bytes32 smtRoot,
        LeafData[] memory leafData,
        bytes32[][] memory allProofs,
        uint256[] memory nullifiers,
        bytes32[] memory nullifierHashes
    ) internal {
        // Calculate total amount
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < leafData.length; i++) {
            totalAmount += leafData[i].amount;
        }

        string memory json = '{\n  "smtRoot": "';
        json = string.concat(json, vm.toString(uint256(smtRoot)));
        json = string.concat(json, '",\n  "treeLevels": ');
        json = string.concat(json, vm.toString(TREE_LEVELS));
        json = string.concat(json, ',\n  "hashFunction": "Poseidon",\n  "treeType": "Sparse Merkle Tree",');
        json = string.concat(json, '\n  "totalAmount": ', vm.toString(totalAmount), ",");
        json = string.concat(json, '\n  "leaves": [\n');

        for (uint256 i = 0; i < leafData.length; i++) {
            uint256 keyUint = uint256(uint160(leafData[i].account));
            bytes32 leafHash = calculateLeafHash(keyUint, leafData[i].amount);

            json = string.concat(json, "    {\n");
            json = string.concat(json, '      "key": "', vm.toString(leafData[i].account), '",\n');
            json = string.concat(json, '      "keyUint": "', vm.toString(keyUint), '",\n');
            json = string.concat(json, '      "value": "', vm.toString(leafData[i].amount), '",\n');
            json = string.concat(json, '      "leafHash": "', vm.toString(uint256(leafHash)), '",\n');
            json = string.concat(json, '      "nullifier": "', vm.toString(nullifiers[i]), '",\n');
            json = string.concat(json, '      "nullifierHash": "', vm.toString(uint256(nullifierHashes[i])), '",\n');
            json = string.concat(json, '      "siblings": [');

            bytes32[] memory proof = allProofs[i];
            for (uint256 j = 0; j < proof.length; j++) {
                json = string.concat(json, '"', vm.toString(uint256(proof[j])), '"');
                if (j < proof.length - 1) json = string.concat(json, ", ");
            }

            json = string.concat(json, "]\n    }");
            if (i < leafData.length - 1) json = string.concat(json, ",");
            json = string.concat(json, "\n");
        }

        json = string.concat(json, "  ]\n}");
        vm.writeFile("./out/smt_results.json", json);
    }

    function writeCircomInputsToFile(
        bytes32 smtRoot,
        LeafData[] memory leafData,
        bytes32[][] memory allProofs,
        uint256[] memory nullifiers,
        bytes32[] memory nullifierHashes
    ) internal {
        string memory json = "[\n";

        for (uint256 i = 0; i < leafData.length; i++) {
            json = string.concat(json, "    {\n");
            json = string.concat(json, '      "merkleRoot": "', vm.toString(uint256(smtRoot)), '",\n');
            json = string.concat(json, '      "nullifierHash": "', vm.toString(uint256(nullifierHashes[i])), '",\n');
            json = string.concat(
                json, '      "userAddress": "', vm.toString(uint256(uint160(leafData[i].account))), '",\n'
            );
            json = string.concat(json, '      "amount": "', vm.toString(leafData[i].amount), '",\n');
            json = string.concat(json, '      "nullifier": "', vm.toString(nullifiers[i]), '",\n');
            json = string.concat(json, '      "siblings": [');

            bytes32[] memory proof = allProofs[i];
            for (uint256 j = 0; j < proof.length; j++) {
                json = string.concat(json, '"', vm.toString(uint256(proof[j])), '"');
                if (j < proof.length - 1) json = string.concat(json, ", ");
            }

            json = string.concat(json, "]\n    }");
            if (i < leafData.length - 1) json = string.concat(json, ",");
            json = string.concat(json, "\n");
        }

        json = string.concat(json, "]");
        vm.writeFile("./out/inputs_circom.json", json);
    }
}
