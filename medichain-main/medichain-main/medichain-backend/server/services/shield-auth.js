/**
 * MediChain Shield - Authentication Service
 * 
 * Wallet-based authentication using EIP-191 signature verification:
 * - Message signing and verification
 * - Nonce management for replay protection
 * - Session token generation (optional)
 */

import { ethers } from "ethers";
import crypto from "crypto";

/**
 * Nonce store (in-memory, replace with Redis for production)
 */
class NonceStore {
  constructor(ttl = 5 * 60 * 1000) {
    // 5 minutes
    this.nonces = new Map();
    this.ttl = ttl;
  }

  generate(address) {
    const nonce = crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + this.ttl;

    this.nonces.set(address.toLowerCase(), { nonce, expiresAt });

    // Cleanup expired nonces
    this._cleanup();

    return nonce;
  }

  verify(address, nonce) {
    const stored = this.nonces.get(address.toLowerCase());

    if (!stored) return false;
    if (stored.nonce !== nonce) return false;
    if (Date.now() > stored.expiresAt) {
      this.nonces.delete(address.toLowerCase());
      return false;
    }

    // Consume nonce (one-time use)
    this.nonces.delete(address.toLowerCase());
    return true;
  }

  _cleanup() {
    const now = Date.now();
    for (const [address, data] of this.nonces.entries()) {
      if (now > data.expiresAt) {
        this.nonces.delete(address);
      }
    }
  }
}

/**
 * Shield Authentication Service
 */
class ShieldAuthService {
  constructor() {
    this.nonceStore = new NonceStore();
  }

  /**
   * Generates authentication message for signing
   */
  generateAuthMessage(address, nonce, options = {}) {
    const { domain = "MediChain Shield", version = "1", purpose = "Authentication" } = options;

    return `${domain} ${purpose}\nVersion: ${version}\nAddress: ${address}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
  }

  /**
   * Requests a nonce for wallet authentication
   */
  requestNonce(address) {
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid Ethereum address");
    }

    const nonce = this.nonceStore.generate(address);
    const message = this.generateAuthMessage(address, nonce);

    return {
      address: address.toLowerCase(),
      nonce,
      message,
      expiresIn: 300, // 5 minutes
    };
  }

  /**
   * Verifies signed message and authenticates wallet
   */
  async verifySignature(address, signature, nonce) {
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid Ethereum address");
    }

    // Verify nonce
    if (!this.nonceStore.verify(address, nonce)) {
      throw new Error("Invalid or expired nonce");
    }

    // Reconstruct message
    const message = this.generateAuthMessage(address, nonce);

    try {
      // Recover signer from signature
      const recoveredAddress = ethers.verifyMessage(message, signature);

      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error("Signature verification failed");
      }

      return {
        authenticated: true,
        address: recoveredAddress.toLowerCase(),
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Middleware to extract and verify wallet from request
   */
  authenticateWallet() {
    return async (req, res, next) => {
      try {
        // Extract from Authorization header: Bearer <signature>:<address>:<nonce>
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(401).json({
            error: "Unauthorized",
            message: "Missing authentication credentials",
          });
        }

        const credentials = authHeader.substring(7);
        const [signature, address, nonce] = credentials.split(":");

        if (!signature || !address || !nonce) {
          return res.status(401).json({
            error: "Unauthorized",
            message: "Invalid authentication format",
          });
        }

        // Verify signature
        const auth = await this.verifySignature(address, signature, nonce);

        // Attach to request
        req.wallet = {
          address: auth.address,
          authenticated: true,
        };

        next();
      } catch (error) {
        return res.status(401).json({
          error: "Unauthorized",
          message: error.message,
        });
      }
    };
  }

  /**
   * Optional middleware: wallet required but not strictly authenticated
   * (for public operations that just need wallet context)
   */
  optionalWallet() {
    return (req, res, next) => {
      const address = req.query.wallet || req.body.wallet;

      if (address && ethers.isAddress(address)) {
        req.wallet = {
          address: address.toLowerCase(),
          authenticated: false,
        };
      }

      next();
    };
  }
}

/**
 * Singleton instance
 */
let instance = null;

export function getShieldAuth() {
  if (!instance) {
    instance = new ShieldAuthService();
  }
  return instance;
}

export default ShieldAuthService;
