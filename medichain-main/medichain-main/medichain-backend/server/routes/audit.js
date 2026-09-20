import { Router } from "express";
import { authMiddleware } from "../services/auth.js";
import { getAuditTrail } from "../services/contract.js";

const router = Router();

router.get("/:recordId", authMiddleware, async (req, res) => {
  try {
    const events = await getAuditTrail(req.params.recordId);
    res.json({ events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch audit trail" });
  }
});

export default router;
