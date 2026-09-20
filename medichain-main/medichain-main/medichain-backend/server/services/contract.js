import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ABI produced by `npx hardhat compile` — copy artifacts/contracts/AccessControl.sol/MediChainAccessControl.json here
const artifactPath = path.join(__dirname, "../abi/MediChainAccessControl.json");
const abi = fs.existsSync(artifactPath)
  ? JSON.parse(fs.readFileSync(artifactPath, "utf-8")).abi
  : [];

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC_URL);

// Backend relayer wallet — used to pay gas on behalf of users for a smoother
// demo (a "gasless" pattern). The actual patient/provider identity is still
// verified via their own wallet signature in services/auth.js.
const relayer = process.env.BACKEND_SIGNER_PRIVATE_KEY
  ? new ethers.Wallet(process.env.BACKEND_SIGNER_PRIVATE_KEY, provider)
  : null;

function contract(signerOrProvider = provider) {
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, signerOrProvider);
}

export function recordIdFor(patientAddress, filename, timestamp) {
  return ethers.keccak256(
    ethers.toUtf8Bytes(`${patientAddress}-${filename}-${timestamp}`)
  );
}

export async function addRecordOnChain(recordId, contentHash, cid) {
  if (!relayer) throw new Error("Relayer key not configured");
  const tx = await contract(relayer).addRecord(recordId, contentHash, cid);
  return tx.wait();
}

export async function grantAccessOnChain(recordId, providerAddress, durationSeconds) {
  if (!relayer) throw new Error("Relayer key not configured");
  const tx = await contract(relayer).grantAccess(recordId, providerAddress, durationSeconds);
  return tx.wait();
}

export async function revokeAccessOnChain(recordId, providerAddress) {
  if (!relayer) throw new Error("Relayer key not configured");
  const tx = await contract(relayer).revokeAccess(recordId, providerAddress);
  return tx.wait();
}

export async function hasAccess(recordId, providerAddress) {
  return contract().hasAccess(recordId, providerAddress);
}

export async function verifyIntegrity(recordId, hashToCheck) {
  return contract().verifyIntegrity(recordId, hashToCheck);
}

/** Reads on-chain events to build the human-readable audit trail. */
export async function getAuditTrail(recordId) {
  const c = contract();
  const filterGrant = c.filters.AccessGranted(recordId);
  const filterRevoke = c.filters.AccessRevoked(recordId);
  const filterView = c.filters.AccessViewed(recordId);

  const [grants, revokes, views] = await Promise.all([
    c.queryFilter(filterGrant),
    c.queryFilter(filterRevoke),
    c.queryFilter(filterView),
  ]);

  const events = [
    ...grants.map((e) => ({ type: "grant", provider: e.args.provider, expiresAt: Number(e.args.expiresAt), timestamp: Number(e.args.timestamp), txHash: e.transactionHash })),
    ...revokes.map((e) => ({ type: "revoke", provider: e.args.provider, timestamp: Number(e.args.timestamp), txHash: e.transactionHash })),
    ...views.map((e) => ({ type: "view", provider: e.args.provider, timestamp: Number(e.args.timestamp), txHash: e.transactionHash })),
  ];

  return events.sort((a, b) => a.timestamp - b.timestamp);
}
