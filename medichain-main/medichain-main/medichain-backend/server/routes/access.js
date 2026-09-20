import { Router } from "express";
import { authMiddleware } from "../services/auth.js";
import { grantAccessOnChain, revokeAccessOnChain, hasAccess } from "../services/contract.js";

const router = Router();

// Patient grants a provider time-boxed access to a record
router.post("/grant", authMiddleware, async (req, res) => {
  try {
    const { recordId, providerAddress, durationSeconds } = req.body;
    if (!recordId || !providerAddress || !durationSeconds) {
      return res.status(400).json({ error: "recordId, providerAddress, and durationSeconds are required" });
    }
    const receipt = await grantAccessOnChain(recordId, providerAddress, durationSeconds);
    res.json({ txHash: receipt.hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to grant access" });
  }
});

// Patient revokes a previously granted access, before its natural expiry
router.post("/revoke", authMiddleware, async (req, res) => {
  try {
    const { recordId, providerAddress } = req.body;
    if (!recordId || !providerAddress) {
      return res.status(400).json({ error: "recordId and providerAddress are required" });
    }
    const receipt = await revokeAccessOnChain(recordId, providerAddress);
    res.json({ txHash: receipt.hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to revoke access" });
  }
});

// Check whether the calling wallet currently has access to a record
router.get("/check/:recordId", authMiddleware, async (req, res) => {
  try {
    const allowed = await hasAccess(req.params.recordId, req.wallet);
    res.json({ hasAccess: allowed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check access" });
  }
});

export default router;
