// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ZKAirDroppedToken} from "../src/ProjectToken.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ProjectTokenTest is Test {
    ZKAirDroppedToken public token;
    address public owner;
    address public user1;

    string public constant TOKEN_NAME = "ZK Airdrop Token";
    string public constant TOKEN_SYMBOL = "ZKAT";

    event Transfer(address indexed from, address indexed to, uint256 value);

    function setUp() public {
        owner = makeAddr("owner");
        user1 = makeAddr("user1");

        vm.prank(owner);
        token = new ZKAirDroppedToken(TOKEN_NAME, TOKEN_SYMBOL, owner);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Deployment                           */
    /*.•°:°.´+˚•*.°:´.•*.•°:°.´•*°.•°:°.´+˚•*.°:´.•*.•°:°.´+˚•*.°:´.•*/

    function test_Deployment_SetsCorrectState() public {
        assertEq(token.name(), TOKEN_NAME, "Name should be set correctly");
        assertEq(token.symbol(), TOKEN_SYMBOL, "Symbol should be set correctly");
        assertEq(token.owner(), owner, "Owner should be set correctly");
        assertEq(token.totalSupply(), 0, "Initial total supply should be zero");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                              Minting                             */
    /*.•°:°.´+˚•*.°:´.•*.•°:°.´•*°.•°:°.´+˚•*.°:´.•*.•°:°.´+˚•*.°:´.•*/

    function test_Mint_ByOwner_Succeeds() public {
        uint256 mintAmount = 100 ether;

        vm.prank(owner);
        token.mint(user1, mintAmount);

        assertEq(token.balanceOf(user1), mintAmount, "User1 balance should be updated");
        assertEq(token.totalSupply(), mintAmount, "Total supply should be updated");
    }

    function test_Mint_ByOwner_EmitsTransferEvent() public {
        uint256 mintAmount = 50 ether;

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(0), user1, mintAmount);

        vm.prank(owner);
        token.mint(user1, mintAmount);
    }

    function test_Revert_When_Mint_ByNonOwner() public {
        uint256 mintAmount = 100 ether;

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user1));
        token.mint(user1, mintAmount);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            Ownership                           */
    /*.•°:°.´+˚•*.°:´.•*.•°:°.´•*°.•°:°.´+˚•*.°:´.•*.•°:°.´+˚•*.°:´.•*/

    function test_TransferOwnership_Succeeds() public {
        vm.prank(owner);
        token.transferOwnership(user1);

        assertEq(token.owner(), user1, "New owner should be user1");

        // The new owner should be able to mint
        uint256 mintAmount = 1 ether;
        vm.prank(user1);
        token.mint(user1, mintAmount);
        assertEq(token.balanceOf(user1), mintAmount, "New owner should be able to mint");
    }

    function test_Revert_When_TransferOwnership_ByNonOwner() public {
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user1));
        token.transferOwnership(user1);
    }
}

