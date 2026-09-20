/**
 * MediChain Shield - Request Validation Middleware
 * 
 * Provides Zod-based schema validation with:
 * - Strict or strip mode for unknown fields
 * - Payload size limits
 * - Type-safe validation
 * - Detailed error messages
 */

const { z } = require("zod");

/**
 * Creates a validation middleware for request body, query, or params
 * @param {z.ZodSchema} schema - Zod schema for validation
 * @param {object} options - Validation options
 * @returns {Function} Express middleware
 */
function validate(schema, options = {}) {
  const {
    target = "body", // 'body', 'query', 'params'
    mode = "strip", // 'strip' (remove unknown) or 'strict' (reject unknown)
    maxSize = 1024 * 1024, // 1MB default
  } = options;

  return async (req, res, next) => {
    try {
      // Check payload size for body requests
      if (target === "body" && req.headers["content-length"]) {
        const contentLength = parseInt(req.headers["content-length"], 10);
        if (contentLength > maxSize) {
          return res.status(413).json({
            error: "Payload Too Large",
            message: `Request body exceeds maximum size of ${maxSize} bytes`,
            maxSize,
          });
        }
      }

      // Get data to validate
      const data = req[target];

      // Apply schema mode
      const modeSchema = mode === "strict" ? schema.strict() : schema;

      // Validate
      const validated = await modeSchema.parseAsync(data);

      // Replace request data with validated data
      req[target] = validated;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Request validation failed",
          details: error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
        });
      }

      // Unexpected error
      next(error);
    }
  };
}

/**
 * Common validation schemas
 */
const schemas = {
  // Ethereum address (0x + 40 hex chars)
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),

  // Bytes32 hash (0x + 64 hex chars)
  bytes32: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid bytes32 hash"),

  // IPFS CID (basic validation)
  ipfsCid: z
    .string()
    .min(46)
    .max(100)
    .regex(/^Qm[a-zA-Z0-9]{44}|^[a-zA-Z0-9]{59}$/, "Invalid IPFS CID"),

  // Unix timestamp (seconds)
  timestamp: z.number().int().positive(),

  // Pagination
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  }),
};

/**
 * Shield-specific validation schemas
 */
const shieldSchemas = {
  // Record registration
  registerRecord: z.object({
    recordId: schemas.bytes32,
    contentHash: schemas.bytes32,
    ciphertextCid: schemas.ipfsCid,
  }),

  // Grant access
  grantAccess: z.object({
    recordId: schemas.bytes32,
    grantee: schemas.address,
    wrappedKeyCid: schemas.ipfsCid,
    expiry: schemas.timestamp,
    signature: z
      .object({
        v: z.number().int().min(27).max(28),
        r: schemas.bytes32,
        s: schemas.bytes32,
        deadline: schemas.timestamp,
      })
      .optional(),
  }),

  // Revoke access
  revokeAccess: z.object({
    recordId: schemas.bytes32,
    grantee: schemas.address,
  }),

  // AI analysis request
  aiAnalysis: z.object({
    recordId: schemas.bytes32,
    clinicalSummary: z.string().min(1).max(10000),
    medications: z.array(z.string().max(500)).max(50),
  }),

  // Audit query
  auditQuery: z.object({
    recordId: schemas.bytes32,
    fromBlock: z.number().int().min(0).optional(),
    toBlock: z.number().int().min(0).optional(),
  }),
};

module.exports = {
  validate,
  schemas,
  shieldSchemas,
};
