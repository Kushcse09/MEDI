/**
 * Attack Demo #2: Expired Grant Attack
 * 
 * Scenario: Grantee attempts to access record after expiration
 * Expected Result: Contract rejects access
 * 
 * Run: npm run attack:expired-grant
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Attack Demo: Expired Grant", function () {
  let accessRegistry;
  let patient, doctor, attacker;
  let recordId;

  beforeEach(async function () {
    [patient, doctor, attacker] = await ethers.getSigners();

    const AccessRegistry = await ethers.getContractFactory("AccessRegistry");
    accessRegistry = await AccessRegistry.deploy();
    await accessRegistry.waitForDeployment();

    recordId = ethers.keccak256(ethers.toUtf8Bytes("medical-record-001"));
    await accessRegistry.connect(patient).registerRecord(recordId);
  });

  it("❌ ATTACK FAILS: Cannot access after grant expiry", async function () {
    console.log("\n🎭 ATTACK SCENARIO: Expired Grant");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 1. Patient grants temporary access
    console.log("\n1️⃣  Patient grants 60-second access to doctor...");
    const shortExpiry = (await time.latest()) + 60; // 60 seconds
    
    await accessRegistry
      .connect(patient)
      .grantAccess(recordId, doctor.address, shortExpiry, "QmTestKey");
    
    console.log(`   ✅ Access granted until ${new Date(shortExpiry * 1000).toISOString()}`);
    console.log(`   📋 Doctor can now access record`);

    // 2. Verify doctor has access
    console.log("\n2️⃣  Verify doctor is authorized...");
    const isAuthorizedNow = await accessRegistry.isAuthorized(recordId, doctor.address);
    console.log(`   ✅ Authorization: ${isAuthorizedNow}`);
    expect(isAuthorizedNow).to.be.true;

    // 3. Time passes - grant expires
    console.log("\n3️⃣  ⏰ Time passes... Fast forward 61 seconds");
    await time.increase(61);
    console.log(`   ⏰ Current time: ${new Date((await time.latest()) * 1000).toISOString()}`);
    console.log(`   ⏰ Grant expired!`);

    // 4. Doctor attempts to access after expiry
    console.log("\n4️⃣  👿 Doctor (now unauthorized) tries to access...");
    
    const isAuthorizedExpired = await accessRegistry.isAuthorized(recordId, doctor.address);
    console.log(`   ❌ Authorization: ${isAuthorizedExpired}`);
    expect(isAuthorizedExpired).to.be.false;

    // 5. Try to log access
    console.log("\n5️⃣  👿 Attempting to log access...");
    try {
      await accessRegistry.connect(doctor).logAccess(recordId);
      throw new Error("SECURITY BREACH: Access allowed after expiry!");
    } catch (error) {
      console.log(`   ❌ Access DENIED: ${error.message.split("(")[0]}`);
      expect(error.message).to.include("Unauthorized");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ATTACK DEFEATED: Time-bounded grants enforce expiry");
    console.log("📝 Conclusion: Access automatically revokes after deadline");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });

  it("✅ LEGITIMATE ACCESS: Within expiry window works", async function () {
    console.log("\n🎭 LEGITIMATE SCENARIO: Valid Access");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    console.log("\n1️⃣  Patient grants 1-hour access...");
    const validExpiry = (await time.latest()) + 3600; // 1 hour
    
    await accessRegistry
      .connect(patient)
      .grantAccess(recordId, doctor.address, validExpiry, "QmTestKey");
    
    console.log(`   ✅ Access granted until ${new Date(validExpiry * 1000).toISOString()}`);

    console.log("\n2️⃣  👨‍⚕️  Doctor accesses record within valid window...");
    const isAuthorized = await accessRegistry.isAuthorized(recordId, doctor.address);
    console.log(`   ✅ Authorization: ${isAuthorized}`);

    await expect(accessRegistry.connect(doctor).logAccess(recordId))
      .to.emit(accessRegistry, "AccessLogged")
      .withArgs(recordId, doctor.address, await time.latest() + 1);

    console.log(`   ✅ Access logged successfully`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ AUTHORIZED ACCESS WORKS: Valid grants allow access");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });

  it("⏰ EXACT EXPIRY: Access valid at expiry second, denied one second after", async function () {
    console.log("\n🎭 BOUNDARY TEST: Expiry Timing");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const expiry = (await time.latest()) + 100;
    await accessRegistry
      .connect(patient)
      .grantAccess(recordId, doctor.address, expiry, "QmTestKey");

    console.log("\n1️⃣  Fast forward to exact expiry second...");
    await time.increaseTo(expiry);
    
    const authorizedAtExpiry = await accessRegistry.isAuthorized(recordId, doctor.address);
    console.log(`   ✅ At expiry second: ${authorizedAtExpiry}`);
    expect(authorizedAtExpiry).to.be.true;

    console.log("\n2️⃣  Move one second past expiry...");
    await time.increase(1);
    
    const authorizedAfterExpiry = await accessRegistry.isAuthorized(recordId, doctor.address);
    console.log(`   ❌ One second after: ${authorizedAfterExpiry}`);
    expect(authorizedAfterExpiry).to.be.false;

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ PRECISE TIMING: Contract enforces exact expiry boundaries");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });
});
