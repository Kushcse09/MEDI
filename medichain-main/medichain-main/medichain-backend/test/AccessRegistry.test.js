/**
 * MediChain Shield - AccessRegistry Contract Tests
 * 
 * Comprehensive test suite targeting >= 95% coverage:
 * - Public key publishing
 * - Record registration
 * - Access grant/revoke flows
 * - EIP-712 signature-based grants
 * - Expiry validation and edge cases
 * - Authorization checks
 * - Access logging
 * - Error conditions and security
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("AccessRegistry", function () {
  let accessRegistry;
  let owner, patient, doctor, attacker;
  let recordId;
  const TEST_PUBLIC_KEY = ethers.encodeBytes32String("test-public-key-32-bytes-pad");
  const WRAPPED_KEY_CID = "QmTest123WrappedKeyContentIdentifier";

  beforeEach(async function () {
    [owner, patient, doctor, attacker] = await ethers.getSigners();

    // Deploy contract
    const AccessRegistry = await ethers.getContractFactory("AccessRegistry");
    accessRegistry = await AccessRegistry.deploy();
    await accessRegistry.waitForDeployment();

    // Generate test record ID
    recordId = ethers.keccak256(ethers.toUtf8Bytes("medical-record-001"));
  });

  describe("Public Key Management", function () {
    it("should publish public key successfully", async function () {
      const tx = await accessRegistry.connect(patient).publishPublicKey(TEST_PUBLIC_KEY);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(accessRegistry, "PublicKeyPublished")
        .withArgs(patient.address, TEST_PUBLIC_KEY, block.timestamp);

      expect(await accessRegistry.publicKeys(patient.address)).to.equal(TEST_PUBLIC_KEY);
    });

    it("should allow updating public key", async function () {
      await accessRegistry.connect(patient).publishPublicKey(TEST_PUBLIC_KEY);

      const newKey = ethers.encodeBytes32String("new-key-32-bytes-padded-here");
      await accessRegistry.connect(patient).publishPublicKey(newKey);

      expect(await accessRegistry.publicKeys(patient.address)).to.equal(newKey);
    });
  });

  describe("Record Registration", function () {
    it("should register a new record", async function () {
      const tx = await accessRegistry.connect(patient).registerRecord(recordId);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(accessRegistry, "RecordRegistered")
        .withArgs(recordId, patient.address, block.timestamp);

      const record = await accessRegistry.records(recordId);
      expect(record.owner).to.equal(patient.address);
      expect(record.exists).to.be.true;
    });

    it("should reject empty record ID", async function () {
      const emptyId = ethers.ZeroHash;
      await expect(accessRegistry.connect(patient).registerRecord(emptyId))
        .to.be.revertedWithCustomError(accessRegistry, "EmptyRecordId");
    });

    it("should reject duplicate record registration", async function () {
      await accessRegistry.connect(patient).registerRecord(recordId);

      await expect(accessRegistry.connect(patient).registerRecord(recordId))
        .to.be.revertedWithCustomError(accessRegistry, "DuplicateGrant");
    });
  });

  describe("Access Granting", function () {
    beforeEach(async function () {
      await accessRegistry.connect(patient).registerRecord(recordId);
    });

    it("should grant access successfully", async function () {
      const expiry = (await time.latest()) + 86400; // 1 day

      await expect(
        accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry, WRAPPED_KEY_CID)
      )
        .to.emit(accessRegistry, "AccessGranted")
        .withArgs(recordId, patient.address, doctor.address, expiry, WRAPPED_KEY_CID, await time.latest() + 1);

      const grant = await accessRegistry.grants(recordId, doctor.address);
      expect(grant.expiry).to.equal(expiry);
      expect(grant.revoked).to.be.false;
      expect(grant.exists).to.be.true;

      const wrappedKey = await accessRegistry.getWrappedKey(recordId, doctor.address);
      expect(wrappedKey).to.equal(WRAPPED_KEY_CID);
    });

    it("should reject non-owner grant attempts", async function () {
      const expiry = (await time.latest()) + 86400;

      await expect(
        accessRegistry.connect(attacker).grantAccess(recordId, doctor.address, expiry, WRAPPED_KEY_CID)
      ).to.be.revertedWithCustomError(accessRegistry, "Unauthorized");
    });

    it("should reject grant for non-existent record", async function () {
      const fakeRecordId = ethers.keccak256(ethers.toUtf8Bytes("fake-record"));
      const expiry = (await time.latest()) + 86400;

      await expect(
        accessRegistry.connect(patient).grantAccess(fakeRecordId, doctor.address, expiry, WRAPPED_KEY_CID)
      ).to.be.revertedWithCustomError(accessRegistry, "RecordNotFound");
    });

    it("should reject zero address grantee", async function () {
      const expiry = (await time.latest()) + 86400;

      await expect(
        accessRegistry.connect(patient).grantAccess(recordId, ethers.ZeroAddress, expiry, WRAPPED_KEY_CID)
      ).to.be.revertedWithCustomError(accessRegistry, "ZeroAddress");
    });

    it("should reject expired grant (expiry in past)", async function () {
      const expiry = (await time.latest()) - 1;

      await expect(
        accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry, WRAPPED_KEY_CID)
      ).to.be.revertedWithCustomError(accessRegistry, "InvalidExpiry");
    });

    it("should reject grant exceeding max duration", async function () {
      const maxDuration = await accessRegistry.MAX_GRANT_DURATION();
      const currentTime = BigInt(await time.latest());
      // Set expiry to current time + max duration + 1 day extra
      const expiry = currentTime + maxDuration + BigInt(86400);

      await expect(
        accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry, WRAPPED_KEY_CID)
      ).to.be.revertedWithCustomError(accessRegistry, "MaxExpiryExceeded");
    });

    it("should reject duplicate active grants", async function () {
      const expiry = (await time.latest()) + 86400;

      await accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry, WRAPPED_KEY_CID);

      // Try to grant again while first is still active
      await expect(
        accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry + 1000, WRAPPED_KEY_CID)
      ).to.be.revertedWithCustomError(accessRegistry, "DuplicateGrant");
    });

    it("should allow re-granting after expiry", async function () {
      const expiry1 = (await time.latest()) + 100;
      await accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry1, WRAPPED_KEY_CID);

      // Fast forward past expiry
      await time.increase(101);

      // Should now be able to grant again
      const expiry2 = (await time.latest()) + 86400;
      await expect(
        accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry2, WRAPPED_KEY_CID)
      ).to.emit(accessRegistry, "AccessGranted");
    });

    it("should allow re-granting after revocation", async function () {
      const expiry1 = (await time.latest()) + 86400;
      await accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry1, WRAPPED_KEY_CID);

      // Revoke
      await accessRegistry.connect(patient).revokeAccess(recordId, doctor.address);

      // Should be able to grant again
      const expiry2 = (await time.latest()) + 86400;
      await expect(
        accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry2, WRAPPED_KEY_CID)
      ).to.emit(accessRegistry, "AccessGranted");
    });
  });

  describe("Access Revocation", function () {
    beforeEach(async function () {
      await accessRegistry.connect(patient).registerRecord(recordId);
      const expiry = (await time.latest()) + 86400;
      await accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry, WRAPPED_KEY_CID);
    });

    it("should revoke access successfully", async function () {
      await expect(accessRegistry.connect(patient).revokeAccess(recordId, doctor.address))
        .to.emit(accessRegistry, "AccessRevoked")
        .withArgs(recordId, patient.address, doctor.address, await time.latest() + 1);

      const grant = await accessRegistry.grants(recordId, doctor.address);
      expect(grant.revoked).to.be.true;
    });

    it("should reject non-owner revocation", async function () {
      await expect(
        accessRegistry.connect(attacker).revokeAccess(recordId, doctor.address)
      ).to.be.revertedWithCustomError(accessRegistry, "Unauthorized");
    });

    it("should reject revocation of non-existent grant", async function () {
      await expect(
        accessRegistry.connect(patient).revokeAccess(recordId, attacker.address)
      ).to.be.revertedWithCustomError(accessRegistry, "GrantNotFound");
    });

    it("should reject double revocation", async function () {
      await accessRegistry.connect(patient).revokeAccess(recordId, doctor.address);

      await expect(
        accessRegistry.connect(patient).revokeAccess(recordId, doctor.address)
      ).to.be.revertedWithCustomError(accessRegistry, "GrantRevoked");
    });
  });

  describe("Authorization Checks", function () {
    beforeEach(async function () {
      await accessRegistry.connect(patient).registerRecord(recordId);
    });

    it("should authorize owner always", async function () {
      expect(await accessRegistry.isAuthorized(recordId, patient.address)).to.be.true;
    });

    it("should authorize valid grantee", async function () {
      const expiry = (await time.latest()) + 86400;
      await accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry, WRAPPED_KEY_CID);

      expect(await accessRegistry.isAuthorized(recordId, doctor.address)).to.be.true;
    });

    it("should not authorize unauthorized address", async function () {
      expect(await accessRegistry.isAuthorized(recordId, attacker.address)).to.be.false;
    });

    it("should not authorize expired grant (exact expiry second)", async function () {
      const expiry = (await time.latest()) + 100;
      await accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry, WRAPPED_KEY_CID);

      // Fast forward to exact expiry time
      await time.increaseTo(expiry);

      // At exact expiry second, should still be authorized
      expect(await accessRegistry.isAuthorized(recordId, doctor.address)).to.be.true;
    });

    it("should not authorize expired grant (one second after)", async function () {
      const expiry = (await time.latest()) + 100;
      await accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry, WRAPPED_KEY_CID);

      // Fast forward past expiry
      await time.increaseTo(expiry + 1);

      expect(await accessRegistry.isAuthorized(recordId, doctor.address)).to.be.false;
    });

    it("should not authorize revoked grant", async function () {
      const expiry = (await time.latest()) + 86400;
      await accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry, WRAPPED_KEY_CID);

      await accessRegistry.connect(patient).revokeAccess(recordId, doctor.address);

      expect(await accessRegistry.isAuthorized(recordId, doctor.address)).to.be.false;
    });
  });

  describe("Access Logging", function () {
    beforeEach(async function () {
      await accessRegistry.connect(patient).registerRecord(recordId);
    });

    it("should log access for owner", async function () {
      await expect(accessRegistry.connect(patient).logAccess(recordId))
        .to.emit(accessRegistry, "AccessLogged")
        .withArgs(recordId, patient.address, await time.latest() + 1);
    });

    it("should log access for authorized grantee", async function () {
      const expiry = (await time.latest()) + 86400;
      await accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry, WRAPPED_KEY_CID);

      await expect(accessRegistry.connect(doctor).logAccess(recordId))
        .to.emit(accessRegistry, "AccessLogged")
        .withArgs(recordId, doctor.address, await time.latest() + 1);
    });

    it("should reject logging for unauthorized address", async function () {
      await expect(
        accessRegistry.connect(attacker).logAccess(recordId)
      ).to.be.revertedWithCustomError(accessRegistry, "Unauthorized");
    });

    it("should reject logging for expired grant", async function () {
      const expiry = (await time.latest()) + 100;
      await accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry, WRAPPED_KEY_CID);

      await time.increase(101);

      await expect(
        accessRegistry.connect(doctor).logAccess(recordId)
      ).to.be.revertedWithCustomError(accessRegistry, "Unauthorized");
    });

    it("should reject logging for revoked grant", async function () {
      const expiry = (await time.latest()) + 86400;
      await accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry, WRAPPED_KEY_CID);

      await accessRegistry.connect(patient).revokeAccess(recordId, doctor.address);

      await expect(
        accessRegistry.connect(doctor).logAccess(recordId)
      ).to.be.revertedWithCustomError(accessRegistry, "Unauthorized");
    });

    it("should reject logging for non-existent record", async function () {
      const fakeRecordId = ethers.keccak256(ethers.toUtf8Bytes("fake-record"));

      await expect(
        accessRegistry.connect(patient).logAccess(fakeRecordId)
      ).to.be.revertedWithCustomError(accessRegistry, "RecordNotFound");
    });
  });

  describe("EIP-712 Signature-Based Grants", function () {
    let domain, types;

    beforeEach(async function () {
      await accessRegistry.connect(patient).registerRecord(recordId);

      // EIP-712 domain
      domain = {
        name: "MediChain Shield",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await accessRegistry.getAddress(),
      };

      // EIP-712 types
      types = {
        GrantPermit: [
          { name: "recordId", type: "bytes32" },
          { name: "grantee", type: "address" },
          { name: "expiry", type: "uint256" },
          { name: "wrappedKeyCid", type: "string" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
    });

    it("should grant access with valid signature", async function () {
      const expiry = (await time.latest()) + 86400;
      const deadline = (await time.latest()) + 3600;
      const nonce = await accessRegistry.nonces(patient.address);

      const value = {
        recordId,
        grantee: doctor.address,
        expiry,
        wrappedKeyCid: WRAPPED_KEY_CID,
        nonce,
        deadline,
      };

      const signature = await patient.signTypedData(domain, types, value);
      const sig = ethers.Signature.from(signature);

      await expect(
        accessRegistry.grantAccessWithSig(
          recordId,
          doctor.address,
          expiry,
          WRAPPED_KEY_CID,
          deadline,
          sig.v,
          sig.r,
          sig.s
        )
      )
        .to.emit(accessRegistry, "AccessGranted")
        .withArgs(recordId, patient.address, doctor.address, expiry, WRAPPED_KEY_CID, await time.latest() + 1);

      // Nonce should increment
      expect(await accessRegistry.nonces(patient.address)).to.equal(nonce + 1n);
    });

    it("should reject expired signature deadline", async function () {
      const expiry = (await time.latest()) + 86400;
      const deadline = (await time.latest()) - 1; // Already expired
      const nonce = await accessRegistry.nonces(patient.address);

      const value = {
        recordId,
        grantee: doctor.address,
        expiry,
        wrappedKeyCid: WRAPPED_KEY_CID,
        nonce,
        deadline,
      };

      const signature = await patient.signTypedData(domain, types, value);
      const sig = ethers.Signature.from(signature);

      await expect(
        accessRegistry.grantAccessWithSig(
          recordId,
          doctor.address,
          expiry,
          WRAPPED_KEY_CID,
          deadline,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.be.revertedWithCustomError(accessRegistry, "SignatureExpired");
    });

    it("should reject signature with wrong nonce (replay protection)", async function () {
      const expiry = (await time.latest()) + 86400;
      const deadline = (await time.latest()) + 3600;
      const nonce = await accessRegistry.nonces(patient.address);

      const value = {
        recordId,
        grantee: doctor.address,
        expiry,
        wrappedKeyCid: WRAPPED_KEY_CID,
        nonce,
        deadline,
      };

      const signature = await patient.signTypedData(domain, types, value);
      const sig = ethers.Signature.from(signature);

      // First use: success
      await accessRegistry.grantAccessWithSig(
        recordId,
        doctor.address,
        expiry,
        WRAPPED_KEY_CID,
        deadline,
        sig.v,
        sig.r,
        sig.s
      );

      // Revoke to allow re-grant
      await accessRegistry.connect(patient).revokeAccess(recordId, doctor.address);

      // Try to replay same signature: should fail due to nonce increment
      await expect(
        accessRegistry.grantAccessWithSig(
          recordId,
          doctor.address,
          expiry,
          WRAPPED_KEY_CID,
          deadline,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.be.revertedWithCustomError(accessRegistry, "InvalidSignature");
    });

    it("should reject signature from wrong signer", async function () {
      const expiry = (await time.latest()) + 86400;
      const deadline = (await time.latest()) + 3600;
      const nonce = await accessRegistry.nonces(patient.address);

      const value = {
        recordId,
        grantee: doctor.address,
        expiry,
        wrappedKeyCid: WRAPPED_KEY_CID,
        nonce,
        deadline,
      };

      // Attacker signs instead of patient
      const signature = await attacker.signTypedData(domain, types, value);
      const sig = ethers.Signature.from(signature);

      await expect(
        accessRegistry.grantAccessWithSig(
          recordId,
          doctor.address,
          expiry,
          WRAPPED_KEY_CID,
          deadline,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.be.revertedWithCustomError(accessRegistry, "InvalidSignature");
    });

    it("should reject signature with mismatched chain ID", async function () {
      // Create domain with wrong chain ID
      const wrongDomain = {
        ...domain,
        chainId: 999999n,
      };

      const expiry = (await time.latest()) + 86400;
      const deadline = (await time.latest()) + 3600;
      const nonce = await accessRegistry.nonces(patient.address);

      const value = {
        recordId,
        grantee: doctor.address,
        expiry,
        wrappedKeyCid: WRAPPED_KEY_CID,
        nonce,
        deadline,
      };

      const signature = await patient.signTypedData(wrongDomain, types, value);
      const sig = ethers.Signature.from(signature);

      await expect(
        accessRegistry.grantAccessWithSig(
          recordId,
          doctor.address,
          expiry,
          WRAPPED_KEY_CID,
          deadline,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.be.revertedWithCustomError(accessRegistry, "InvalidSignature");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await accessRegistry.connect(patient).registerRecord(recordId);
    });

    it("should get grant details", async function () {
      const expiry = (await time.latest()) + 86400;
      await accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry, WRAPPED_KEY_CID);

      const grant = await accessRegistry.getGrant(recordId, doctor.address);
      expect(grant.expiry).to.equal(expiry);
      expect(grant.revoked).to.be.false;
      expect(grant.exists).to.be.true;
    });

    it("should get wrapped key CID", async function () {
      const expiry = (await time.latest()) + 86400;
      await accessRegistry.connect(patient).grantAccess(recordId, doctor.address, expiry, WRAPPED_KEY_CID);

      const cid = await accessRegistry.getWrappedKey(recordId, doctor.address);
      expect(cid).to.equal(WRAPPED_KEY_CID);
    });

    it("should get domain separator", async function () {
      const separator = await accessRegistry.DOMAIN_SEPARATOR();
      expect(separator).to.have.lengthOf(66); // 0x + 64 hex chars (32 bytes)
      expect(separator).to.match(/^0x[0-9a-f]{64}$/i);
    });
  });
});
