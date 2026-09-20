/**
 * MediChain Shield - Type Definitions
 * 
 * Shared types for Shield client library
 */

/**
 * Transaction lifecycle states
 */
export type TransactionStatus =
  | "idle"
  | "signing"
  | "pending"
  | "confirmed"
  | "error";

/**
 * Transaction state
 */
export interface TransactionState {
  status: TransactionStatus;
  txHash?: string;
  error?: string;
  blockNumber?: number;
  timestamp?: number;
}

/**
 * Keypair for encryption
 */
export interface ShieldKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/**
 * Access grant data
 */
export interface AccessGrant {
  recordId: string;
  grantee: string;
  expiry: number;
  wrappedKeyCid: string;
  active: boolean;
  revoked: boolean;
}

/**
 * Audit event
 */
export interface AuditEvent {
  event: string;
  blockNumber: number;
  transactionHash: string;
  timestamp?: number;
  [key: string]: any;
}

/**
 * Audit trail
 */
export interface AuditTrail {
  recordId: string;
  totalEvents: number;
  events: AuditEvent[];
  queriedBlocks: {
    from: number;
    to: number | string;
  };
}

/**
 * AI analysis request
 */
export interface AIAnalysisRequest {
  recordId: string;
  clinicalSummary: string;
  medications: string[];
}

/**
 * AI analysis result
 */
export interface AIAnalysisResult {
  status: "SUCCESS" | "QUARANTINED" | "DEGRADED" | "ERROR";
  data: {
    interactions: string[];
    severity: "none" | "low" | "medium" | "high";
    confidence: number;
    notes: string;
  };
  tokensUsed: number;
  detections?: any[];
  reason?: string;
}

/**
 * Shield API response wrapper
 */
export interface ShieldResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

/**
 * Storage result
 */
export interface StorageResult {
  recordId: string;
  cid: string;
  size: number;
}

/**
 * Wrapped key storage result
 */
export interface WrappedKeyResult {
  recordId: string;
  grantee: string;
  wrappedKeyCid: string;
  expiry: number;
}

/**
 * Authentication nonce data
 */
export interface NonceData {
  address: string;
  nonce: string;
  message: string;
  expiresIn: number;
}

/**
 * Hook options
 */
export interface HookOptions {
  enabled?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Record encryption result
 */
export interface EncryptedRecord {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  wrappedKeys: Map<string, Uint8Array>; // grantee address -> wrapped key
}
