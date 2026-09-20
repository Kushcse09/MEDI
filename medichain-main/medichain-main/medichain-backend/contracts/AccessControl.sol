// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MediChain Access Control
/// @notice Anchors record hashes on-chain and manages time-boxed,
///         revocable access grants between patients and providers.
///         All grant/revoke/view actions emit events that form an
///         immutable audit trail.
contract MediChainAccessControl {
    struct Record {
        address owner;          // patient wallet
        bytes32 contentHash;    // hash of the encrypted file stored on IPFS
        string cid;             // IPFS content identifier
        uint256 createdAt;
        bool exists;
    }

    struct Grant {
        uint256 expiresAt;      // 0 = no active grant
        bool revoked;
    }

    // recordId => Record
    mapping(bytes32 => Record) public records;

    // recordId => provider address => Grant
    mapping(bytes32 => mapping(address => Grant)) public grants;

    event RecordAdded(bytes32 indexed recordId, address indexed owner, string cid, bytes32 contentHash, uint256 timestamp);
    event AccessGranted(bytes32 indexed recordId, address indexed owner, address indexed provider, uint256 expiresAt, uint256 timestamp);
    event AccessRevoked(bytes32 indexed recordId, address indexed owner, address indexed provider, uint256 timestamp);
    event AccessViewed(bytes32 indexed recordId, address indexed provider, uint256 timestamp);

    modifier onlyOwner(bytes32 recordId) {
        require(records[recordId].exists, "Record does not exist");
        require(records[recordId].owner == msg.sender, "Not record owner");
        _;
    }

    /// @notice Register a new encrypted record. Called after the file
    ///         has already been uploaded to IPFS by the backend.
    function addRecord(bytes32 recordId, bytes32 contentHash, string calldata cid) external {
        require(!records[recordId].exists, "Record already exists");
        records[recordId] = Record({
            owner: msg.sender,
            contentHash: contentHash,
            cid: cid,
            createdAt: block.timestamp,
            exists: true
        });
        emit RecordAdded(recordId, msg.sender, cid, contentHash, block.timestamp);
    }

    /// @notice Grant a provider time-boxed access to a record.
    /// @param durationSeconds how long the grant should remain valid
    function grantAccess(bytes32 recordId, address provider, uint256 durationSeconds) external onlyOwner(recordId) {
        uint256 expiresAt = block.timestamp + durationSeconds;
        grants[recordId][provider] = Grant({ expiresAt: expiresAt, revoked: false });
        emit AccessGranted(recordId, msg.sender, provider, expiresAt, block.timestamp);
    }

    /// @notice Revoke a previously granted access, before its natural expiry.
    function revokeAccess(bytes32 recordId, address provider) external onlyOwner(recordId) {
        grants[recordId][provider].revoked = true;
        emit AccessRevoked(recordId, msg.sender, provider, block.timestamp);
    }

    /// @notice Providers call this before reading a record off IPFS —
    ///         it both checks and logs the access, keeping the audit trail complete.
    function checkAndLogAccess(bytes32 recordId) external returns (string memory cid, bytes32 contentHash) {
        Grant memory g = grants[recordId][msg.sender];
        require(g.expiresAt != 0, "No grant issued");
        require(!g.revoked, "Access revoked");
        require(block.timestamp <= g.expiresAt, "Access expired");

        emit AccessViewed(recordId, msg.sender, block.timestamp);

        Record memory r = records[recordId];
        return (r.cid, r.contentHash);
    }

    /// @notice Read-only check used by the frontend before rendering UI state.
    function hasAccess(bytes32 recordId, address provider) external view returns (bool) {
        Grant memory g = grants[recordId][provider];
        if (g.expiresAt == 0 || g.revoked) return false;
        return block.timestamp <= g.expiresAt;
    }

    /// @notice Verifies a freshly-downloaded file still matches its
    ///         on-chain hash, proving it has not been tampered with.
    function verifyIntegrity(bytes32 recordId, bytes32 hashToCheck) external view returns (bool) {
        require(records[recordId].exists, "Record does not exist");
        return records[recordId].contentHash == hashToCheck;
    }
}
