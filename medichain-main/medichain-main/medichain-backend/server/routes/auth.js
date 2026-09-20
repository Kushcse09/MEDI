import { Router } from "express";
import { generateNonce, verifySignatureAndIssueToken } from "../services/auth.js";

const router = Router();

// Step 1: frontend requests a nonce for the wallet address about to sign in
router.post("/nonce", (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: "address is required" });
  const nonce = generateNonce(address);
  res.json({ nonce });
});

// Step 2: frontend sends back the signature produced by the wallet signing that nonce
router.post("/login", (req, res) => {
  const { address, signature } = req.body;
  if (!address || !signature) return res.status(400).json({ error: "address and signature are required" });

  try {
    const token = verifySignatureAndIssueToken(address, signature);
    res.json({ token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

export default router;
