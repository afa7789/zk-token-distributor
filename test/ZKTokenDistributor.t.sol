// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ZKTokenDistributor} from "../src/ZKTokenDistributor.sol";
import {ZKAirDroppedToken} from "../src/ProjectToken.sol";
import {VerifierZK} from "../src/VerifierZK.sol";
import {IZKTokenDistributor} from "../src/interfaces/IZKTokenDistributor.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Mock Verifier for testing
contract MockVerifierZK {
    bool public shouldReturnTrue = true;

    function verifyProof(uint256[2] calldata, uint256[2][2] calldata, uint256[2] calldata, uint256[1] calldata)
        external
        view
        returns (bool)
    {
        return shouldReturnTrue;
    }

    function setShouldReturnTrue(bool _shouldReturn) external {
        shouldReturnTrue = _shouldReturn;
    }
}

contract ZKTokenDistributorTest is Test {
    ZKTokenDistributor public distributor;
    ZKAirDroppedToken public token;
    MockVerifierZK public mockVerifier;

    address public owner;
    address public user1;
    address public user2;
    address public user3;

    bytes32 public constant ROOT = bytes32(uint256(0x123456789abcdef));
    uint256 public constant TOTAL_CLAIMABLE = 1000 ether;
    uint256 public claimPeriodStart;
    uint256 public claimPeriodEnd;

    // Mock ZK proof data
    uint256[2] public mockPa = [uint256(1), uint256(2)];
    uint256[2][2] public mockPb = [[uint256(3), uint256(4)], [uint256(5), uint256(6)]];
    uint256[2] public mockPc = [uint256(7), uint256(8)];

    event Claimed(address indexed _user, uint256 _amount);
    event Swept(address indexed _sweepReceiver, uint256 _amount);
    event Withdrawn(address indexed _to, uint256 _amount);

    function setUp() public {
        owner = makeAddr("owner");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");

        claimPeriodStart = block.timestamp + 1 days;
        claimPeriodEnd = claimPeriodStart + 30 days;

        // Deploy mock verifier
        mockVerifier = new MockVerifierZK();

        // Deploy token
        vm.prank(owner);
        token = new ZKAirDroppedToken("Test Token", "TEST", owner);

        // Deploy distributor
        vm.prank(owner);
        distributor = new ZKTokenDistributor(
            ROOT, token, address(mockVerifier), TOTAL_CLAIMABLE, claimPeriodStart, claimPeriodEnd
        );

        // Mint tokens to distributor
        vm.prank(owner);
        token.mint(address(distributor), TOTAL_CLAIMABLE);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Deployment                           */
    /*.•°:°.´+˚•*.°:´.•*.•°:°.´•*°.•°:°.´+˚•*.°:´.•*.•°:°.´+˚•*.°:´.•*/

    function test_Deployment_SetsCorrectState() public {
        assertEq(distributor.root(), ROOT, "Root should be set correctly");
        assertEq(address(distributor.token()), address(token), "Token should be set correctly");
        assertEq(address(distributor.verifier()), address(mockVerifier), "Verifier should be set correctly");
        assertEq(distributor.totalClaimable(), TOTAL_CLAIMABLE, "Total claimable should be set correctly");
        assertEq(distributor.claimPeriodStart(), claimPeriodStart, "Claim period start should be set correctly");
        assertEq(distributor.claimPeriodEnd(), claimPeriodEnd, "Claim period end should be set correctly");

        assertTrue(distributor.hasRole(distributor.DEFAULT_ADMIN_ROLE(), owner), "Owner should have default admin role");
        assertTrue(distributor.hasRole(distributor.ADMIN_ROLE(), owner), "Owner should have admin role");
    }

    function test_Revert_When_InvalidToken() public {
        vm.prank(owner);
        vm.expectRevert(IZKTokenDistributor.InvalidToken.selector);
        new ZKTokenDistributor(
            ROOT, IERC20(address(0)), address(mockVerifier), TOTAL_CLAIMABLE, claimPeriodStart, claimPeriodEnd
        );
    }

    function test_Revert_When_InvalidVerifier() public {
        vm.prank(owner);
        vm.expectRevert(IZKTokenDistributor.InvalidAddress.selector);
        new ZKTokenDistributor(ROOT, token, address(0), TOTAL_CLAIMABLE, claimPeriodStart, claimPeriodEnd);
    }

    function test_Revert_When_InvalidAmount() public {
        vm.prank(owner);
        vm.expectRevert(IZKTokenDistributor.InvalidAmount.selector);
        new ZKTokenDistributor(ROOT, token, address(mockVerifier), 0, claimPeriodStart, claimPeriodEnd);
    }

    function test_Revert_When_InvalidTimestamp() public {
        vm.prank(owner);
        vm.expectRevert(IZKTokenDistributor.InvalidTimestamp.selector);
        new ZKTokenDistributor(ROOT, token, address(mockVerifier), TOTAL_CLAIMABLE, block.timestamp - 1, claimPeriodEnd);
    }

    function test_Revert_When_ClaimPeriodInvalid() public {
        vm.prank(owner);
        vm.expectRevert(IZKTokenDistributor.ClaimPeriodInvalid.selector);
        new ZKTokenDistributor(
            ROOT, token, address(mockVerifier), TOTAL_CLAIMABLE, claimPeriodStart, claimPeriodStart - 1
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            Claims                              */
    /*.•°:°.´+˚•*.°:´.•*.•°:°.´•*°.•°:°.´+˚•*.°:´.•*.•°:°.´+˚•*.°:´.•*/

    function test_Claim_Succeeds() public {
        vm.warp(claimPeriodStart + 1);

        uint256 claimAmount = 100 ether;
        bytes32 nullifierHash = keccak256(abi.encodePacked(user1, "secret1"));
        uint256[1] memory pubSignals = [uint256(nullifierHash)];

        uint256 userBalanceBefore = token.balanceOf(user1);
        uint256 distributorBalanceBefore = token.balanceOf(address(distributor));
        uint256 totalClaimableBefore = distributor.totalClaimable();

        vm.expectEmit(true, true, true, true);
        emit Claimed(user1, claimAmount);

        vm.prank(user1);
        distributor.claim(mockPa, mockPb, mockPc, pubSignals, claimAmount);

        assertEq(token.balanceOf(user1), userBalanceBefore + claimAmount, "User balance should increase");
        assertEq(
            token.balanceOf(address(distributor)),
            distributorBalanceBefore - claimAmount,
            "Distributor balance should decrease"
        );
        assertEq(distributor.totalClaimable(), totalClaimableBefore - claimAmount, "Total claimable should decrease");
        assertTrue(distributor.usedNullifiers(nullifierHash), "Nullifier should be marked as used");
    }

    function test_Revert_When_ClaimPeriodNotStarted() public {
        vm.warp(claimPeriodStart - 1);

        uint256 claimAmount = 100 ether;
        bytes32 nullifierHash = keccak256(abi.encodePacked(user1, "secret1"));
        uint256[1] memory pubSignals = [uint256(nullifierHash)];

        vm.prank(user1);
        vm.expectRevert(IZKTokenDistributor.TokenDistributor_ClaimPeriodNotStarted.selector);
        distributor.claim(mockPa, mockPb, mockPc, pubSignals, claimAmount);
    }

    function test_Revert_When_ClaimPeriodEnded() public {
        vm.warp(claimPeriodEnd + 1);

        uint256 claimAmount = 100 ether;
        bytes32 nullifierHash = keccak256(abi.encodePacked(user1, "secret1"));
        uint256[1] memory pubSignals = [uint256(nullifierHash)];

        vm.prank(user1);
        vm.expectRevert(IZKTokenDistributor.TokenDistributor_ClaimPeriodEnded.selector);
        distributor.claim(mockPa, mockPb, mockPc, pubSignals, claimAmount);
    }

    function test_Revert_When_ZeroAmount() public {
        vm.warp(claimPeriodStart + 1);

        bytes32 nullifierHash = keccak256(abi.encodePacked(user1, "secret1"));
        uint256[1] memory pubSignals = [uint256(nullifierHash)];

        vm.prank(user1);
        vm.expectRevert(IZKTokenDistributor.TokenDistributor_ZeroAmount.selector);
        distributor.claim(mockPa, mockPb, mockPc, pubSignals, 0);
    }

    function test_Revert_When_NullifierAlreadyUsed() public {
        vm.warp(claimPeriodStart + 1);

        uint256 claimAmount = 100 ether;
        bytes32 nullifierHash = keccak256(abi.encodePacked(user1, "secret1"));
        uint256[1] memory pubSignals = [uint256(nullifierHash)];

        // First claim should succeed
        vm.prank(user1);
        distributor.claim(mockPa, mockPb, mockPc, pubSignals, claimAmount);

        // Second claim with same nullifier should fail
        vm.prank(user2);
        vm.expectRevert(IZKTokenDistributor.TokenDistributor_NullifierAlreadyUsed.selector);
        distributor.claim(mockPa, mockPb, mockPc, pubSignals, claimAmount);
    }

    function test_Revert_When_ZKProofFails() public {
        vm.warp(claimPeriodStart + 1);

        // Set mock verifier to return false
        mockVerifier.setShouldReturnTrue(false);

        uint256 claimAmount = 100 ether;
        bytes32 nullifierHash = keccak256(abi.encodePacked(user1, "secret1"));
        uint256[1] memory pubSignals = [uint256(nullifierHash)];

        vm.prank(user1);
        vm.expectRevert(IZKTokenDistributor.TokenDistributor_FailedZKProofVerify.selector);
        distributor.claim(mockPa, mockPb, mockPc, pubSignals, claimAmount);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            Sweep                              */
    /*.•°:°.´+˚•*.°:´.•*.•°:°.´•*°.•°:°.´+˚•*.°:´.•*.•°:°.´+˚•*.°:´.•*/

    function test_Sweep_Succeeds() public {
        vm.warp(claimPeriodEnd + 1);

        uint256 sweepAmount = token.balanceOf(address(distributor));
        uint256 receiverBalanceBefore = token.balanceOf(user1);

        vm.expectEmit(true, true, true, true);
        emit Swept(user1, sweepAmount);

        vm.prank(owner);
        distributor.sweep(user1);

        assertEq(token.balanceOf(address(distributor)), 0, "Distributor should have no tokens");
        assertEq(token.balanceOf(user1), receiverBalanceBefore + sweepAmount, "Receiver should get all tokens");
    }

    function test_Revert_When_Sweep_ClaimPeriodNotEnded() public {
        vm.warp(claimPeriodEnd - 1);

        vm.prank(owner);
        vm.expectRevert(IZKTokenDistributor.TokenDistributor_ClaimPeriodNotEnded.selector);
        distributor.sweep(user1);
    }

    function test_Revert_When_Sweep_ByNonAdmin() public {
        vm.warp(claimPeriodEnd + 1);

        vm.prank(user1);
        vm.expectRevert();
        distributor.sweep(user1);
    }

    function test_Revert_When_Sweep_InvalidAddress() public {
        vm.warp(claimPeriodEnd + 1);

        vm.prank(owner);
        vm.expectRevert(IZKTokenDistributor.InvalidAddress.selector);
        distributor.sweep(address(0));
    }

    function test_Revert_When_Sweep_NoTokens() public {
        vm.warp(claimPeriodEnd + 1);

        // First sweep all tokens
        vm.prank(owner);
        distributor.sweep(user1);

        // Second sweep should fail
        vm.prank(owner);
        vm.expectRevert(IZKTokenDistributor.TokenDistributor_NoTokensToSweep.selector);
        distributor.sweep(user1);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Withdraw                            */
    /*.•°:°.´+˚•*.°:´.•*.•°:°.´•*°.•°:°.´+˚•*.°:´.•*.•°:°.´+˚•*.°:´.•*/

    function test_Withdraw_Succeeds() public {
        uint256 withdrawAmount = 200 ether;
        uint256 receiverBalanceBefore = token.balanceOf(user1);
        uint256 distributorBalanceBefore = token.balanceOf(address(distributor));

        vm.expectEmit(true, true, true, true);
        emit Withdrawn(user1, withdrawAmount);

        vm.prank(owner);
        distributor.withdraw(user1, withdrawAmount);

        assertEq(token.balanceOf(user1), receiverBalanceBefore + withdrawAmount, "Receiver balance should increase");
        assertEq(
            token.balanceOf(address(distributor)),
            distributorBalanceBefore - withdrawAmount,
            "Distributor balance should decrease"
        );
    }

    function test_Revert_When_Withdraw_ByNonAdmin() public {
        vm.prank(user1);
        vm.expectRevert();
        distributor.withdraw(user1, 100 ether);
    }

    function test_Revert_When_Withdraw_InvalidAddress() public {
        vm.prank(owner);
        vm.expectRevert(IZKTokenDistributor.InvalidAddress.selector);
        distributor.withdraw(address(0), 100 ether);
    }

    function test_Revert_When_Withdraw_ZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(IZKTokenDistributor.InvalidAmount.selector);
        distributor.withdraw(user1, 0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         Admin Roles                           */
    /*.•°:°.´+˚•*.°:´.•*.•°:°.´•*°.•°:°.´+˚•*.°:´.•*.•°:°.´+˚•*.°:´.•*/

    function test_GrantAdminRole_Succeeds() public {
        assertFalse(distributor.hasRole(distributor.ADMIN_ROLE(), user1), "User1 should not have admin role initially");

        vm.prank(owner);
        distributor.grantAdminRole(user1);

        assertTrue(distributor.hasRole(distributor.ADMIN_ROLE(), user1), "User1 should have admin role after grant");

        // User1 should now be able to withdraw
        vm.prank(user1);
        distributor.withdraw(user2, 50 ether);
    }

    function test_RevokeAdminRole_Succeeds() public {
        // First grant admin role
        vm.prank(owner);
        distributor.grantAdminRole(user1);
        assertTrue(distributor.hasRole(distributor.ADMIN_ROLE(), user1), "User1 should have admin role");

        // Then revoke it
        vm.prank(owner);
        distributor.revokeAdminRole(user1);
        assertFalse(
            distributor.hasRole(distributor.ADMIN_ROLE(), user1), "User1 should not have admin role after revoke"
        );
    }

    function test_Revert_When_GrantAdminRole_ByNonDefaultAdmin() public {
        vm.prank(user1);
        vm.expectRevert();
        distributor.grantAdminRole(user2);
    }

    function test_Revert_When_RevokeAdminRole_ByNonDefaultAdmin() public {
        vm.prank(user1);
        vm.expectRevert();
        distributor.revokeAdminRole(owner);
    }

    function test_Revert_When_GrantAdminRole_InvalidAddress() public {
        vm.prank(owner);
        vm.expectRevert(IZKTokenDistributor.InvalidAddress.selector);
        distributor.grantAdminRole(address(0));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Integration                            */
    /*.•°:°.´+˚•*.°:´.•*.•°:°.´•*°.•°:°.´+˚•*.°:´.•*.•°:°.´+˚•*.°:´.•*/

    function test_MultipleClaimsWithDifferentNullifiers() public {
        vm.warp(claimPeriodStart + 1);

        uint256 claimAmount = 100 ether;

        // User1 claims with nullifier1
        bytes32 nullifierHash1 = keccak256(abi.encodePacked(user1, "secret1"));
        uint256[1] memory pubSignals1 = [uint256(nullifierHash1)];

        vm.prank(user1);
        distributor.claim(mockPa, mockPb, mockPc, pubSignals1, claimAmount);

        // User2 claims with nullifier2
        bytes32 nullifierHash2 = keccak256(abi.encodePacked(user2, "secret2"));
        uint256[1] memory pubSignals2 = [uint256(nullifierHash2)];

        vm.prank(user2);
        distributor.claim(mockPa, mockPb, mockPc, pubSignals2, claimAmount);

        assertEq(token.balanceOf(user1), claimAmount, "User1 should have claimed tokens");
        assertEq(token.balanceOf(user2), claimAmount, "User2 should have claimed tokens");
        assertEq(distributor.totalClaimable(), TOTAL_CLAIMABLE - (2 * claimAmount), "Total claimable should be reduced");
        assertTrue(distributor.usedNullifiers(nullifierHash1), "Nullifier1 should be used");
        assertTrue(distributor.usedNullifiers(nullifierHash2), "Nullifier2 should be used");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    Real Calldata Test                        */
    /*.•°:°.´+˚•*.°:´.•*.•°:°.´•*°.•°:°.´+˚•*.°:´.•*.•°:°.´+˚•*.°:´.•*/

    /**
     * @notice Test with REAL calldata from your ZK proof generation
     * This uses the actual proof data from circuits/circom/output/calldata.txt
     * and the amount from circuits/circom/input.json
     */
    function test_Claim_WithRealCalldata() public {
        // Deploy with REAL VerifierZK contract instead of mock
        VerifierZK realVerifier = new VerifierZK();
        
        ZKTokenDistributor realDistributor = new ZKTokenDistributor(
            ROOT,
            IERC20(address(token)),
            address(realVerifier),
            TOTAL_CLAIMABLE,
            claimPeriodStart,
            claimPeriodEnd
        );

        // Transfer tokens to the real distributor
        vm.prank(owner);
        token.mint(address(realDistributor), TOTAL_CLAIMABLE);

        // Warp to claim period
        vm.warp(claimPeriodStart + 1);

        // Your REAL calldata from circuits/circom/output/calldata.txt
        uint256[2] memory realPa = [
            0x288b8b6fad3c5f4711a8e76e6fcdb98f820051fb4fbe3dece66cfc0907e9017d,
            0x16681dd0680033808a1ddc0ee9a060670abbd82a8e48bd0425f48bace866f240
        ];

        uint256[2][2] memory realPb = [
            [
                0x008c07847d9f93d742e8c6c7b1ede7adc18e596b2007146fd5f944bcd5378b55,
                0x2f4dd9f435df8566a829656c84e0c6b42dc627aaf0e352c4c1bed605d2bb3085
            ],
            [
                0x2bc98ebf48b0c2ee285a08988f64d5e2c63f32caa654910411ef7069a361f69c,
                0x214173a7face6251f2bf42ded96c200165c16102fc198bb9c5be511e377829d3
            ]
        ];

        uint256[2] memory realPc = [
            0x16abc825322f5c3e54dbbce691e4268d6d61ac3600d446b86878c1b4bb2ae140,
            0x0a6da990eeadf5d915d51ab25e5d584fade63937bd669c7473a515c698d84826
        ];

        // Public signals - nullifierHash from your input.json
        uint256[1] memory realPubSignals = [
            uint256(0x0000000000000000000000000000000000000000000000000000000000000000)
        ];

        // Amount from your input.json - but let's use a smaller amount that fits in our test distributor
        // Original: 20000000000000000000000 (20,000 tokens)
        // Test amount: 100000000000000000000 (100 tokens - within our 1000 token limit)
        uint256 realAmount = 100000000000000000000; // 100 * 10^18

        console.log("=== Testing Real Calldata ===");
        console.log("Amount to claim:", realAmount);
        console.log("User balance before:", token.balanceOf(user1));
        console.log("Distributor balance before:", token.balanceOf(address(realDistributor)));

        // First verify the proof works with the VerifierZK directly
        bool proofValid = realVerifier.verifyProof(realPa, realPb, realPc, realPubSignals);
        console.log("Direct proof verification:", proofValid);
        assertTrue(proofValid, "Your real proof should be valid");

        // Now test the full claim function
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit Claimed(user1, realAmount);
        
        realDistributor.claim(realPa, realPb, realPc, realPubSignals, realAmount);

        console.log("User balance after:", token.balanceOf(user1));
        console.log("Distributor balance after:", token.balanceOf(address(realDistributor)));

        // Assertions
        assertEq(token.balanceOf(user1), realAmount, "User should receive the claimed amount");
        assertEq(
            realDistributor.totalClaimable(), 
            TOTAL_CLAIMABLE - realAmount, 
            "Total claimable should be reduced"
        );
        
        // Check nullifier is used
        bytes32 nullifierHash = bytes32(realPubSignals[0]);
        assertTrue(
            realDistributor.usedNullifiers(nullifierHash), 
            "Nullifier should be marked as used"
        );

        console.log("=== Real Calldata Test PASSED! ===");
    }

    /**
     * @notice Test that prevents double spending with real calldata
     */
    function test_Revert_When_RealCalldata_DoubleSpend() public {
        // Deploy with REAL VerifierZK contract
        VerifierZK realVerifier = new VerifierZK();
        
        ZKTokenDistributor realDistributor = new ZKTokenDistributor(
            ROOT,
            IERC20(address(token)),
            address(realVerifier),
            TOTAL_CLAIMABLE,
            claimPeriodStart,
            claimPeriodEnd
        );

        // Transfer tokens to the real distributor
        vm.prank(owner);
        token.mint(address(realDistributor), TOTAL_CLAIMABLE);

        // Warp to claim period
        vm.warp(claimPeriodStart + 1);

        // Your REAL calldata
        uint256[2] memory realPa = [
            0x288b8b6fad3c5f4711a8e76e6fcdb98f820051fb4fbe3dece66cfc0907e9017d,
            0x16681dd0680033808a1ddc0ee9a060670abbd82a8e48bd0425f48bace866f240
        ];

        uint256[2][2] memory realPb = [
            [
                0x008c07847d9f93d742e8c6c7b1ede7adc18e596b2007146fd5f944bcd5378b55,
                0x2f4dd9f435df8566a829656c84e0c6b42dc627aaf0e352c4c1bed605d2bb3085
            ],
            [
                0x2bc98ebf48b0c2ee285a08988f64d5e2c63f32caa654910411ef7069a361f69c,
                0x214173a7face6251f2bf42ded96c200165c16102fc198bb9c5be511e377829d3
            ]
        ];

        uint256[2] memory realPc = [
            0x16abc825322f5c3e54dbbce691e4268d6d61ac3600d446b86878c1b4bb2ae140,
            0x0a6da990eeadf5d915d51ab25e5d584fade63937bd669c7473a515c698d84826
        ];

        uint256[1] memory realPubSignals = [
            uint256(0x0000000000000000000000000000000000000000000000000000000000000000)
        ];

        uint256 realAmount = 100000000000000000000; // 100 * 10^18 (reduced for test)

        // First claim should succeed
        vm.prank(user1);
        realDistributor.claim(realPa, realPb, realPc, realPubSignals, realAmount);

        // Second claim with same nullifier should fail
        vm.prank(user2); // Different user but same nullifier
        vm.expectRevert(IZKTokenDistributor.TokenDistributor_NullifierAlreadyUsed.selector);
        realDistributor.claim(realPa, realPb, realPc, realPubSignals, realAmount);

        console.log("Double spend protection works correctly!");
    }
}