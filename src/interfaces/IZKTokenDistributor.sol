// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface IZKTokenDistributor {
    // Events
    event Claimed(address indexed _user, uint256 _amount);
    event Swept(address indexed _sweepReceiver, uint256 _amount);
    event Withdrawn(address indexed _to, uint256 _amount);

    // Custom errors
    error InvalidToken();
    error InvalidAmount();
    error InvalidAddress();
    error InvalidTimestamp();
    error InvalidMerkleRoot();
    error ClaimPeriodInvalid();
    error TokenDistributor_ClaimPeriodNotStarted();
    error TokenDistributor_ClaimPeriodEnded();
    error TokenDistributor_ClaimPeriodNotEnded();
    error TokenDistributor_ZeroAmount();
    error TokenDistributor_AlreadyClaimed();
    error TokenDistributor_FailedZKProofVerify();
    error TokenDistributor_NullifierAlreadyUsed();
    error TokenDistributor_NoTokensToSweep();

    // Core functions
    function claim(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[3] calldata _pubSignals
    ) external;

    function sweep(address _sweepReceiver) external;

    function withdraw(address _to, uint256 _amount) external;

    // Admin functions
    function grantAdminRole(address _account) external;

    function revokeAdminRole(address _account) external;

    // View functions for state variables
    function root() external view returns (bytes32);

    function totalClaimable() external view returns (uint256);

    function claimPeriodStart() external view returns (uint256);

    function claimPeriodEnd() external view returns (uint256);

    function usedNullifiers(bytes32 nullifierHash) external view returns (bool);
}
