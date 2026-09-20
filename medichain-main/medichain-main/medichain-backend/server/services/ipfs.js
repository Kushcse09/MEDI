import { Web3Storage, File } from "web3.storage";
import CryptoJS from "crypto-js";
import { keccak256, toUtf8Bytes } from "ethers";

function client() {
  return new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN });
}

/**
 * Encrypts a file buffer client-side-style (AES) using a per-record key,
 * uploads the ciphertext to IPFS, and returns the CID plus a hash of the
 * ciphertext (this hash is what gets anchored on-chain for tamper-proofing).
 *
 * In a production build the AES key should be generated and held by the
 * patient (e.g. derived from their wallet signature), never stored server-side.
 * This demo version generates it server-side for simplicity.
 */
export async function encryptAndUpload(fileBuffer, filename, encryptionKey) {
  const base64 = fileBuffer.toString("base64");
  const ciphertext = CryptoJS.AES.encrypt(base64, encryptionKey).toString();

  const file = new File([ciphertext], `${filename}.enc`, { type: "text/plain" });
  const cid = await client().put([file], { wrapWithDirectory: false });

  const contentHash = keccak256(toUtf8Bytes(ciphertext));

  return { cid, contentHash };
}

/** Fetches ciphertext from IPFS and decrypts it back into the original file bytes. */
export async function fetchAndDecrypt(cid, encryptionKey) {
  const res = await fetch(`https://${cid}.ipfs.w3s.link`);
  if (!res.ok) throw new Error("Failed to fetch record from IPFS");
  const ciphertext = await res.text();

  const bytes = CryptoJS.AES.decrypt(ciphertext, encryptionKey);
  const base64 = bytes.toString(CryptoJS.enc.Utf8);
  return Buffer.from(base64, "base64");
}

export function hashCiphertext(ciphertext) {
  return keccak256(toUtf8Bytes(ciphertext));
}
