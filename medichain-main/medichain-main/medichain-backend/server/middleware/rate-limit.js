/**
 * MediChain Shield - Rate Limiting Middleware
 * 
 * Implements multi-tier rate limiting:
 * - IP-based global limits
 * - Wallet-based authenticated limits
 * - Endpoint-specific limits (AI)
 * - Sliding window counters
 */

const rateLimit = require("express-rate-limit");
const { ethers } = require("ethers");

/**
 * Extract wallet address from Authorization header or request body
 */
function extractWallet(req) {
  // Try Authorization header (Bearer <signature>:<address>)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const parts = authHeader.substring(7).split(":");
    if (parts.length === 2 && ethers.isAddress(parts[1])) {
      return parts[1].toLowerCase();
    }
  }

  // Try request body
  if (req.body && req.body.wallet && ethers.isAddress(req.body.wallet)) {
    return req.body.wallet.toLowerCase();
  }

  return null;
}

/**
 * IP-based rate limiter
 * Applied globally to all requests
 */
const ipRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: {
    error: "Too Many Requests",
    message: "IP rate limit exceeded. Please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === "test";
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For if behind proxy, otherwise req.ip
    return req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.ip;
  },
});

/**
 * Wallet-based rate limiter
 * Applied after authentication to enforce per-wallet limits
 */
const walletRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per wallet
  message: {
    error: "Too Many Requests",
    message: "Wallet rate limit exceeded. Please try again later.",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
  keyGenerator: (req) => {
    const wallet = extractWallet(req);
    // Fall back to IP if no wallet found
    return wallet || req.ip;
  },
  skipSuccessfulRequests: false,
});

/**
 * AI endpoint rate limiter
 * Stricter limits for compute-intensive AI operations
 */
const aiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute per wallet
  message: {
    error: "Too Many Requests",
    message:
      "AI service rate limit exceeded. Maximum 10 requests per minute.",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
  keyGenerator: (req) => {
    const wallet = extractWallet(req);
    return wallet ? `ai:${wallet}` : `ai:${req.ip}`;
  },
});

/**
 * Sensitive operation rate limiter
 * Very strict limits for grant/revoke operations
 */
const sensitiveOpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 operations per 5 minutes
  message: {
    error: "Too Many Requests",
    message:
      "Sensitive operation rate limit exceeded. Please try again later.",
    retryAfter: "5 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
  keyGenerator: (req) => {
    const wallet = extractWallet(req);
    return wallet ? `sensitive:${wallet}` : `sensitive:${req.ip}`;
  },
});

/**
 * Custom rate limiter factory
 * Creates rate limiters with custom configurations
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,
    max = 60,
    message = "Rate limit exceeded",
    keyPrefix = "",
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      error: "Too Many Requests",
      message,
      retryAfter: `${Math.ceil(windowMs / 1000)} seconds`,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === "test",
    keyGenerator: (req) => {
      const wallet = extractWallet(req);
      const key = wallet || req.ip;
      return keyPrefix ? `${keyPrefix}:${key}` : key;
    },
  });
}

module.exports = {
  ipRateLimiter,
  walletRateLimiter,
  aiRateLimiter,
  sensitiveOpRateLimiter,
  createRateLimiter,
  extractWallet,
};
