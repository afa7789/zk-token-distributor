// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

import {VerifierZK} from "./VerifierZK.sol";

import {IZKTokenDistributor} from "./interfaces/IZKTokenDistributor.sol";

/**
 * @title ZKTokenDistributor
 *   @notice Distributes ERC20 tokens via Merkle proofs 
 *   during a specified claim period
 */
contract ZKTokenDistributor is AccessControlEnumerable, IZKTokenDistributor {
    using SafeERC20 for IERC20;

    /**
     * @notice Role for authorized operations (sweep, withdraw)
     */
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /**
     * @notice Merkle root for claims
     */
    bytes32 public root;

    /**
     * @notice ZK Verifier contract instance
     */
    VerifierZK public immutable verifier;

    /**
     * @notice ERC20 token being distributed
     */
    IERC20 public token;

    /**
     * @notice Total tokens allocated for distribution
     */
    uint256 public totalClaimable;

    /**
     * @notice Start timestamp for claim period
     */
    uint256 public claimPeriodStart;

    /**
     * @notice End timestamp for claim period
     */
    uint256 public claimPeriodEnd;

    /**
     * @notice Mapping of used nullifier hashes to prevent double-spending
     */
    mapping(bytes32 => bool) public usedNullifiers;

    /**
     * @param _root Merkle root for claims
     * @param _token ERC20 token address
     * @param _verifier ZK Verifier contract address
     * @param _totalClaimable Total tokens to distribute 
     * @param _claimPeriodStart Distribution start timestamp
     * @param _claimPeriodEnd Distribution end timestamp
     */
    constructor(
        bytes32 _root,
        IERC20 _token,
        address _verifier,
        uint256 _totalClaimable,
        uint256 _claimPeriodStart,
        uint256 _claimPeriodEnd
    ) {
        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        // Validation with custom errors (more gas efficient):
        if (address(_token) == address(0)) revert InvalidToken();
        if (_verifier == address(0)) revert InvalidAddress();
        if (_totalClaimable == 0) revert InvalidAmount();
        if (_claimPeriodStart <= block.timestamp) revert InvalidTimestamp();
        if (_claimPeriodEnd <= _claimPeriodStart) revert ClaimPeriodInvalid();

        // Set storage variables
        root = _root;
        token = _token;
        verifier = VerifierZK(_verifier);
        totalClaimable = _totalClaimable;
        claimPeriodStart = _claimPeriodStart;
        claimPeriodEnd = _claimPeriodEnd;
    }

    /**
     * @notice Claims tokens using ZK proof
     * @param _pA Groth16 proof point A
     * @param _pB Groth16 proof point B  
     * @param _pC Groth16 proof point C
     * @param _pubSignals Public signals (should include nullifierHash)
     * @param _amount Amount to claim
     */
    function claim(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[1] calldata _pubSignals,
        uint256 _amount
    ) external {
        _claim(_pA, _pB, _pC, _pubSignals, _amount);
    }

    /**
     * @notice Withdraws any remaining tokens
     * @dev Only admin role
     * @param _sweepReceiver Address to send tokens
     */
    function sweep(address _sweepReceiver) external override {
        // Check admin role using AccessControl
        if (!hasRole(ADMIN_ROLE, msg.sender)) revert AccessControlUnauthorizedAccount(msg.sender, ADMIN_ROLE);
        
        // Must be after claim period
        if (block.timestamp <= claimPeriodEnd) revert TokenDistributor_ClaimPeriodNotEnded();

        // Validate sweep receiver
        if (_sweepReceiver == address(0)) revert InvalidAddress();

        // Transfer out tokens
        uint256 _balance = token.balanceOf(address(this));
        if (_balance == 0) revert TokenDistributor_NoTokensToSweep();

        token.safeTransfer(_sweepReceiver, _balance);

        emit Swept({_sweepReceiver: _sweepReceiver, _amount: _balance});
    }

    /**
     * @notice Withdraws tokens during claim period 
     * @dev Only admin role
     * @param _to Receiver of tokens
     * @param _amount Tokens to withdraw
     */
    function withdraw(address _to, uint256 _amount) external override {
        // Check admin role using AccessControl
        if (!hasRole(ADMIN_ROLE, msg.sender)) revert AccessControlUnauthorizedAccount(msg.sender, ADMIN_ROLE);
        
        if (_to == address(0)) revert InvalidAddress();
        if (_amount == 0) revert InvalidAmount();

        token.safeTransfer(_to, _amount);

        emit Withdrawn({_to: _to, _amount: _amount});
    }

    /**
     * @notice Grants admin role to a new account
     * @dev Only default admin role can call this
     * @param _account Address to grant admin role
     */
    function grantAdminRole(address _account) external {
        // Check default admin role using AccessControl
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert AccessControlUnauthorizedAccount(msg.sender, DEFAULT_ADMIN_ROLE);
        
        if (_account == address(0)) revert InvalidAddress();
        _grantRole(ADMIN_ROLE, _account);
    }

    /**
     * @notice Revokes admin role from an account
     * @dev Only default admin role can call this
     * @param _account Address to revoke admin role from
     */
    function revokeAdminRole(address _account) external {
        // Check default admin role using AccessControl
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert AccessControlUnauthorizedAccount(msg.sender, DEFAULT_ADMIN_ROLE);
        
        _revokeRole(ADMIN_ROLE, _account);
    }

    /**
     * @notice Internal claim logic
     * @param _pA Groth16 proof point A
     * @param _pB Groth16 proof point B  
     * @param _pC Groth16 proof point C
     * @param _pubSignals Public signals (should include nullifierHash)
     * @param _amount Amount to claim
     */
    function _claim(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[1] calldata _pubSignals,
        uint256 _amount
    ) internal {
        // Extract nullifier hash from public signals
        bytes32 nullifierHash = bytes32(_pubSignals[0]);
        
        // Validate claim with ZK proof
        _validateClaim(_pA, _pB, _pC, _pubSignals, _amount);

        // Mark nullifier as used (prevents double-spending)
        usedNullifiers[nullifierHash] = true;

        // Update total supply
        totalClaimable -= _amount;

        // Transfer tokens
        token.safeTransfer(msg.sender, _amount);

        emit Claimed({_user: msg.sender, _amount: _amount});
    }

    /**
     * @notice Checks if currently in claim period
     * @return _active Whether period is active
     */
    function _claimPeriodActive() internal view returns (bool _active) {
        _active = block.timestamp >= claimPeriodStart && block.timestamp <= claimPeriodEnd;
    }

    /**
     * @notice Internal claim validation using ZK proof
     * @param _pA Groth16 proof point A
     * @param _pB Groth16 proof point B  
     * @param _pC Groth16 proof point C
     * @param _pubSignals Public signals (should include nullifierHash)
     * @param _amount Claim amount
     */
    function _validateClaim(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[1] calldata _pubSignals,
        uint256 _amount
    ) internal view {
        // Extract nullifier hash from public signals
        bytes32 nullifierHash = bytes32(_pubSignals[0]);
        // Validate basic conditions
        if (block.timestamp < claimPeriodStart) revert TokenDistributor_ClaimPeriodNotStarted();
        if (block.timestamp > claimPeriodEnd) revert TokenDistributor_ClaimPeriodEnded();
        if (_amount == 0) revert TokenDistributor_ZeroAmount();
        // Check if nullifier was already used (prevents double-spending)
        if (usedNullifiers[nullifierHash]) revert TokenDistributor_NullifierAlreadyUsed();
        // Verify ZK proof
        if (!_zkProofVerified(_pA, _pB, _pC, _pubSignals)) revert TokenDistributor_FailedZKProofVerify();
    }

        /**
     * @notice Verifies a ZK proof using the VerifierZK contract
     * @param _pA Groth16 proof point A
     * @param _pB Groth16 proof point B  
     * @param _pC Groth16 proof point C
     * @param _pubSignals Public signals for the proof
     * @return _valid Validity of proof
     */
    function _zkProofVerified(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[1] calldata _pubSignals
    ) internal view returns (bool _valid) {
        return verifier.verifyProof(_pA, _pB, _pC, _pubSignals);
    }
}