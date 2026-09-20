import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../services/auth.js";
import { encryptAndUpload, fetchAndDecrypt } from "../services/ipfs.js";
import { addRecordOnChain, recordIdFor, verifyIntegrity } from "../services/contract.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// In-memory metadata store — swap for Postgres in production.
// Keyed by recordId => { patient, filename, cid, contentHash, encryptionKey, createdAt }
const recordMeta = new Map();

/**
 * Upload a new medical record.
 * Flow: encrypt -> pin to IPFS -> anchor hash + CID on-chain -> store metadata.
 */
router.post("/", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const patient = req.wallet;
    const file = req.file;
    if (!file) return res.status(400).json({ error: "file is required" });

    // Demo key derivation — in production this comes from the patient's own
    // wallet (e.g. signed-message-derived key), never generated server-side.
    const encryptionKey = `${patient}-${Date.now()}`;

    const { cid, contentHash } = await encryptAndUpload(file.buffer, file.originalname, encryptionKey);
    const timestamp = Date.now();
    const recordId = recordIdFor(patient, file.originalname, timestamp);

    await addRecordOnChain(recordId, contentHash, cid);

    recordMeta.set(recordId, {
      patient,
      filename: file.originalname,
      cid,
      contentHash,
      encryptionKey,
      createdAt: timestamp,
    });

    res.status(201).json({ recordId, cid, contentHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload record" });
  }
});

// List the calling patient's own records
router.get("/mine", authMiddleware, (req, res) => {
  const mine = [...recordMeta.entries()]
    .filter(([, meta]) => meta.patient.toLowerCase() === req.wallet.toLowerCase())
    .map(([recordId, meta]) => ({
      recordId,
      filename: meta.filename,
      cid: meta.cid,
      createdAt: meta.createdAt,
    }));
  res.json({ records: mine });
});

// A provider (who must already hold an on-chain grant — enforced by the
// contract's checkAndLogAccess in a full implementation) fetches a record
router.get("/:recordId", authMiddleware, async (req, res) => {
  try {
    const meta = recordMeta.get(req.params.recordId);
    if (!meta) return res.status(404).json({ error: "Record not found" });

    const fileBuffer = await fetchAndDecrypt(meta.cid, meta.encryptionKey);
    const verified = await verifyIntegrity(req.params.recordId, meta.contentHash);

    res.json({
      filename: meta.filename,
      verified,
      contentBase64: fileBuffer.toString("base64"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch record" });
  }
});

export default router;
