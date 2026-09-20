// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AccessRegistry
 * @notice MediChain Shield - Decentralized Access Control Registry
 * 
 * Manages encrypted medical record access grants with:
 * - Time-bounded access grants with expiry
 * - Owner-only grant/revoke operations
 * - EIP-712 signature-based delegation
 * - Public key registry for X25519 keypairs
 * - Immutable audit trail via events
 * 
 * Security properties:
 * - Owner authorization for all grants
 * - Maximum expiry duration cap (90 days)
 * - Duplicate grant prevention
 * - Nonce-based replay protection for signatures
 * - Reentrancy protection
 */

contract AccessRegistry {
    // =============================================================
    //                          CONSTANTS
    // =============================================================

    /// @notice Maximum duration for access grants (90 days)
    uint256 public constant MAX_GRANT_DURATION = 90 days;

    /// @notice EIP-712 domain separator type hash
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    /// @notice EIP-712 grant permit type hash
    bytes32 public constant GRANT_PERMIT_TYPEHASH =
        keccak256(
            "GrantPermit(bytes32 recordId,address grantee,uint256 expiry,string wrappedKeyCid,uint256 nonce,uint256 deadline)"
        );

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Medical record metadata
    struct Record {
        address owner;
        bool exists;
    }

    /// @notice Access grant details (packed for gas efficiency)
    struct Grant {
        uint64 expiry; // Timestamp when grant expires (sufficient until year 584 billion)
        bool revoked;  // Revocation flag
        bool exists;   // Existence flag
    }

    /// @notice Public key registry for X25519 keypairs
    mapping(address => bytes32) public publicKeys;

    /// @notice Record ID => Record metadata
    mapping(bytes32 => Record) public records;

    /// @notice Record ID => Grantee => Grant details
    mapping(bytes32 => mapping(address => Grant)) public grants;

    /// @notice Wrapped key CID storage: Record ID => Grantee => IPFS CID
    mapping(bytes32 => mapping(address => string)) public wrappedKeys;

    /// @notice EIP-712 nonces for signature-based grants
    mapping(address => uint256) public nonces;

    /// @notice Reentrancy guard
    bool private _locked;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event PublicKeyPublished(address indexed account, bytes32 publicKey, uint256 timestamp);

    event RecordRegistered(bytes32 indexed recordId, address indexed owner, uint256 timestamp);

    event AccessGranted(
        bytes32 indexed recordId,
        address indexed owner,
        address indexed grantee,
        uint256 expiry,
        string wrappedKeyCid,
        uint256 timestamp
    );

    event AccessRevoked(
        bytes32 indexed recordId,
        address indexed owner,
        address indexed grantee,
        uint256 timestamp
    );

    event AccessLogged(bytes32 indexed recordId, address indexed accessor, uint256 timestamp);

    // =============================================================
    //                          ERRORS
    // =============================================================

    error Unauthorized();
    error RecordNotFound();
    error GrantNotFound();
    error GrantExpired();
    error GrantRevoked();
    error DuplicateGrant();
    error MaxExpiryExceeded();
    error SignatureExpired();
    error InvalidSignature();
    error InvalidExpiry();
    error EmptyRecordId();
    error ZeroAddress();
    error ReentrancyGuard();

    // =============================================================
    //                          MODIFIERS
    // =============================================================

    modifier nonReentrant() {
        if (_locked) revert ReentrancyGuard();
        _locked = true;
        _;
        _locked = false;
    }

    modifier onlyRecordOwner(bytes32 recordId) {
        if (!records[recordId].exists) revert RecordNotFound();
        if (records[recordId].owner != msg.sender) revert Unauthorized();
        _;
    }

    // =============================================================
    //                     PUBLIC KEY MANAGEMENT
    // =============================================================

    /**
     * @notice Publishes caller's X25519 public key for encrypted key exchange
     * @param x25519PublicKey Public key bytes (32 bytes)
     */
    function publishPublicKey(bytes32 x25519PublicKey) external {
        publicKeys[msg.sender] = x25519PublicKey;
        emit PublicKeyPublished(msg.sender, x25519PublicKey, block.timestamp);
    }

    // =============================================================
    //                     RECORD MANAGEMENT
    // =============================================================

    /**
     * @notice Registers a new medical record
     * @param recordId Unique record identifier (content hash)
     */
    function registerRecord(bytes32 recordId) external {
        if (recordId == bytes32(0)) revert EmptyRecordId();
        if (records[recordId].exists) revert DuplicateGrant(); // Reusing error for clarity

        records[recordId] = Record({owner: msg.sender, exists: true});

        emit RecordRegistered(recordId, msg.sender, block.timestamp);
    }

    // =============================================================
    //                     ACCESS CONTROL
    // =============================================================

    /**
     * @notice Grants access to a record for a specific address
     * @param recordId Record identifier
     * @param grantee Address receiving access
     * @param expiry Unix timestamp when access expires
     * @param wrappedKeyCid IPFS CID of wrapped encryption key
     */
    function grantAccess(
        bytes32 recordId,
        address grantee,
        uint256 expiry,
        string calldata wrappedKeyCid
    ) external nonReentrant onlyRecordOwner(recordId) {
        _grantAccess(recordId, grantee, expiry, wrappedKeyCid);
    }

    /**
     * @notice Grants access using an EIP-712 signature (gasless for owner)
     * @param recordId Record identifier
     * @param grantee Address receiving access
     * @param expiry Unix timestamp when access expires
     * @param wrappedKeyCid IPFS CID of wrapped encryption key
     * @param deadline Signature expiry timestamp
     * @param v ECDSA signature v
     * @param r ECDSA signature r
     * @param s ECDSA signature s
     */
    function grantAccessWithSig(
        bytes32 recordId,
        address grantee,
        uint256 expiry,
        string calldata wrappedKeyCid,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        if (block.timestamp > deadline) revert SignatureExpired();
        if (!records[recordId].exists) revert RecordNotFound();

        address owner = records[recordId].owner;

        // Build EIP-712 digest
        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256("MediChain Shield"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(
                GRANT_PERMIT_TYPEHASH,
                recordId,
                grantee,
                expiry,
                keccak256(bytes(wrappedKeyCid)),
                nonces[owner]++,
                deadline
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        address signer = ecrecover(digest, v, r, s);
        if (signer != owner || signer == address(0)) revert InvalidSignature();

        _grantAccess(recordId, grantee, expiry, wrappedKeyCid);
    }

    /**
     * @notice Internal grant logic shared by direct and signature-based grants
     */
    function _grantAccess(
        bytes32 recordId,
        address grantee,
        uint256 expiry,
        string calldata wrappedKeyCid
    ) internal {
        if (grantee == address(0)) revert ZeroAddress();
        if (expiry <= block.timestamp) revert InvalidExpiry();
        if (expiry > block.timestamp + MAX_GRANT_DURATION) revert MaxExpiryExceeded();

        Grant storage existingGrant = grants[recordId][grantee];
        if (existingGrant.exists && !existingGrant.revoked && existingGrant.expiry > block.timestamp) {
            revert DuplicateGrant();
        }

        grants[recordId][grantee] = Grant({expiry: uint64(expiry), revoked: false, exists: true});

        wrappedKeys[recordId][grantee] = wrappedKeyCid;

        emit AccessGranted(
            recordId,
            records[recordId].owner,
            grantee,
            expiry,
            wrappedKeyCid,
            block.timestamp
        );
    }

    /**
     * @notice Revokes access for a specific grantee
     * @param recordId Record identifier
     * @param grantee Address to revoke access from
     */
    function revokeAccess(bytes32 recordId, address grantee)
        external
        nonReentrant
        onlyRecordOwner(recordId)
    {
        Grant storage grant = grants[recordId][grantee];
        if (!grant.exists) revert GrantNotFound();
        if (grant.revoked) revert GrantRevoked();

        grant.revoked = true;

        emit AccessRevoked(recordId, msg.sender, grantee, block.timestamp);
    }

    /**
     * @notice Checks if an address is authorized to access a record
     * @param recordId Record identifier
     * @param accessor Address to check
     * @return bool True if authorized
     */
    function isAuthorized(bytes32 recordId, address accessor) external view returns (bool) {
        // Owner always has access
        if (records[recordId].owner == accessor) {
            return true;
        }

        Grant storage grant = grants[recordId][accessor];

        return grant.exists && !grant.revoked && block.timestamp <= grant.expiry;
    }

    /**
     * @notice Logs an access event (must be authorized)
     * @param recordId Record identifier
     */
    function logAccess(bytes32 recordId) external nonReentrant {
        if (!records[recordId].exists) revert RecordNotFound();

        // Check authorization
        bool authorized = false;

        // Owner always authorized
        if (records[recordId].owner == msg.sender) {
            authorized = true;
        } else {
            Grant storage grant = grants[recordId][msg.sender];
            if (grant.exists && !grant.revoked && block.timestamp <= grant.expiry) {
                authorized = true;
            }
        }

        if (!authorized) revert Unauthorized();

        emit AccessLogged(recordId, msg.sender, block.timestamp);
    }

    // =============================================================
    //                          VIEWS
    // =============================================================

    /**
     * @notice Gets grant details for a specific record and grantee
     * @param recordId Record identifier
     * @param grantee Address to query
     * @return expiry Grant expiry timestamp
     * @return revoked Whether grant is revoked
     * @return exists Whether grant exists
     */
    function getGrant(bytes32 recordId, address grantee)
        external
        view
        returns (
            uint256 expiry,
            bool revoked,
            bool exists
        )
    {
        Grant storage grant = grants[recordId][grantee];
        return (grant.expiry, grant.revoked, grant.exists);
    }

    /**
     * @notice Gets the wrapped key CID for a grantee
     * @param recordId Record identifier
     * @param grantee Address to query
     * @return string IPFS CID of wrapped key
     */
    function getWrappedKey(bytes32 recordId, address grantee) external view returns (string memory) {
        return wrappedKeys[recordId][grantee];
    }

    /**
     * @notice Gets the EIP-712 domain separator
     * @return bytes32 Domain separator
     */
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    DOMAIN_TYPEHASH,
                    keccak256("MediChain Shield"),
                    keccak256("1"),
                    block.chainid,
                    address(this)
                )
            );
    }
}
