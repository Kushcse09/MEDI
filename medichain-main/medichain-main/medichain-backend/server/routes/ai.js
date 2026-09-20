import { Router } from "express";
import { authMiddleware } from "../services/auth.js";
import { checkForConflicts } from "../services/ai.js";

const router = Router();

router.post("/check-conflicts", authMiddleware, async (req, res) => {
  try {
    const { newRecordSummary, knownAllergies, knownMedications } = req.body;
    if (!newRecordSummary) return res.status(400).json({ error: "newRecordSummary is required" });

    const result = await checkForConflicts({ newRecordSummary, knownAllergies, knownMedications });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to run AI safety check" });
  }
});

export default router;
