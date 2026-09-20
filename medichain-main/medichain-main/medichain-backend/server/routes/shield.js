/**
 * MediChain Shield - API Routes
 * 
 * Endpoints for encrypted medical record management:
 * - POST /shield/records - Register encrypted record
 * - POST /shield/wrapped-keys - Store wrapped key grant
 * - GET /shield/audit/:recordId - Get audit trail
 * - GET /shield/access-logs/:recordId - Get access logs
 * - GET /shield/grants/:recordId - Get grant history
 * - POST /shield/ai/analyze - AI safety analysis (Phase 4)
 * - GET /shield/auth/nonce - Get authentication nonce
 */

import express from "express";
import { getShieldStorage } from "../services/shield-storage.js";
import { getShieldAudit } from "../services/shield-audit.js";
import { getShieldAuth } from "../services/shield-auth.js";

const router = express.Router();

// Get service instances
const storage = getShieldStorage();
const audit = getShieldAudit();
const auth = getShieldAuth();

/**
 * Health check
 */
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "MediChain Shield",
    storage: storage.getStatus(),
    timestamp: Date.now(),
  });
});

/**
 * Authentication: Request nonce
 * GET /shield/auth/nonce?address=0x...
 */
router.get("/auth/nonce", (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Address parameter required",
      });
    }

    const nonceData = auth.requestNonce(address);

    res.json({
      success: true,
      data: nonceData,
    });
  } catch (error) {
    res.status(400).json({
      error: "Bad Request",
      message: error.message,
    });
  }
});

/**
 * Register encrypted record
 * POST /shield/records
 * Body: { recordId, ciphertext (base64 or Buffer), metadata }
 */
router.post("/records", async (req, res) => {
  try {
    const { recordId, ciphertext, metadata = {} } = req.body;

    if (!recordId || !ciphertext) {
      return res.status(400).json({
        error: "Bad Request",
        message: "recordId and ciphertext are required",
      });
    }

    // Convert base64 to buffer if needed
    const buffer =
      typeof ciphertext === "string"
        ? Buffer.from(ciphertext, "base64")
        : Buffer.from(ciphertext);

    // Store ciphertext
    const cid = await storage.storeCiphertext(buffer, metadata);

    res.status(201).json({
      success: true,
      data: {
        recordId,
        cid,
        size: buffer.length,
      },
    });
  } catch (error) {
    console.error("Record registration failed:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

/**
 * Store wrapped key grant
 * POST /shield/wrapped-keys
 * Body: { recordId, grantee, wrappedKey (base64), expiry }
 */
router.post("/wrapped-keys", async (req, res) => {
  try {
    const { recordId, grantee, wrappedKey, expiry } = req.body;

    if (!recordId || !grantee || !wrappedKey) {
      return res.status(400).json({
        error: "Bad Request",
        message: "recordId, grantee, and wrappedKey are required",
      });
    }

    // Convert base64 to buffer
    const buffer =
      typeof wrappedKey === "string"
        ? Buffer.from(wrappedKey, "base64")
        : Buffer.from(wrappedKey);

    // Store wrapped key
    const cid = await storage.storeCiphertext(buffer, {
      type: "wrapped-key",
      recordId,
      grantee,
      expiry,
    });

    res.status(201).json({
      success: true,
      data: {
        recordId,
        grantee,
        wrappedKeyCid: cid,
        expiry,
      },
    });
  } catch (error) {
    console.error("Wrapped key storage failed:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

/**
 * Retrieve ciphertext by CID
 * GET /shield/ciphertext/:cid
 */
router.get("/ciphertext/:cid", async (req, res) => {
  try {
    const { cid } = req.params;

    const ciphertext = await storage.retrieveCiphertext(cid);

    res.setHeader("Content-Type", "application/octet-stream");
    res.send(ciphertext);
  } catch (error) {
    console.error("Ciphertext retrieval failed:", error);
    res.status(404).json({
      error: "Not Found",
      message: "Ciphertext not found",
    });
  }
});

/**
 * Get complete audit trail for a record
 * GET /shield/audit/:recordId?fromBlock=0&toBlock=latest
 */
router.get("/audit/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;
    const { fromBlock, toBlock } = req.query;

    const auditTrail = await audit.getRecordAudit(recordId, {
      fromBlock: fromBlock ? parseInt(fromBlock, 10) : 0,
      toBlock: toBlock || "latest",
      includeTimestamps: true,
    });

    res.json({
      success: true,
      data: auditTrail,
    });
  } catch (error) {
    console.error("Audit query failed:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

/**
 * Get access logs for a record
 * GET /shield/access-logs/:recordId
 */
router.get("/access-logs/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;
    const { fromBlock, toBlock } = req.query;

    const logs = await audit.getAccessLogs(recordId, {
      fromBlock: fromBlock ? parseInt(fromBlock, 10) : 0,
      toBlock: toBlock || "latest",
    });

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error("Access log query failed:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

/**
 * Get grant history for a record
 * GET /shield/grants/:recordId
 */
router.get("/grants/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;

    const grants = await audit.getGrantHistory(recordId);

    res.json({
      success: true,
      data: grants,
    });
  } catch (error) {
    console.error("Grant history query failed:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

/**
 * Get address activity
 * GET /shield/activity/:address
 */
router.get("/activity/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const { fromBlock, toBlock } = req.query;

    const activity = await audit.getAddressActivity(address, {
      fromBlock: fromBlock ? parseInt(fromBlock, 10) : 0,
      toBlock: toBlock || "latest",
    });

    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error("Activity query failed:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

/**
 * AI Analysis endpoint
 * POST /shield/ai/analyze
 * Body: { recordId, clinicalSummary, medications }
 */
router.post("/ai/analyze", async (req, res) => {
  try {
    const { recordId, clinicalSummary, medications } = req.body;

    if (!recordId || !clinicalSummary || !Array.isArray(medications)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "recordId, clinicalSummary, and medications array are required",
      });
    }

    // Import AI services (lazy load)
    const { getAIGuard } = await import("../services/ai-guard.js");
    const { getLLMAdapter } = await import("../services/llm-adapter.js");

    const aiGuard = getAIGuard();
    const llmAdapter = getLLMAdapter();

    // Run analysis with guard protection
    const result = await aiGuard.analyzeWithGuard(
      clinicalSummary,
      medications,
      llmAdapter
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("AI analysis failed:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

/**
 * Clear audit cache (admin endpoint)
 * POST /shield/admin/clear-cache
 */
router.post("/admin/clear-cache", (req, res) => {
  audit.clearCache();

  res.json({
    success: true,
    message: "Audit cache cleared",
    stats: audit.getCacheStats(),
  });
});

export default router;
