/**
 * MediChain Shield - API Client
 * 
 * Typed client for Shield backend endpoints with error handling and validation.
 */

import type {
  ShieldResponse,
  StorageResult,
  WrappedKeyResult,
  AuditTrail,
  AIAnalysisRequest,
  AIAnalysisResult,
  NonceData,
} from "./types";

/**
 * Shield API client configuration
 */
export interface ShieldApiConfig {
  baseUrl?: string;
  timeout?: number;
}

/**
 * Shield API Client
 */
export class ShieldApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: ShieldApiConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.NEXT_PUBLIC_SHIELD_API_URL || "http://localhost:4000/shield";
    this.timeout = config.timeout || 30000;
  }

  /**
   * Generic fetch with error handling
   */
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ShieldResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Request timeout");
        }
        throw error;
      }
      throw new Error("Unknown error");
    }
  }

  /**
   * Health check
   */
  async health(): Promise<{ status: string; storage: any }> {
    const response = await this.fetch<any>("/health");
    return response.data;
  }

  /**
   * Authentication: Request nonce
   */
  async requestNonce(address: string): Promise<NonceData> {
    const response = await this.fetch<NonceData>(
      `/auth/nonce?address=${address}`
    );
    return response.data;
  }

  /**
   * Register encrypted record
   */
  async registerRecord(
    recordId: string,
    ciphertext: Uint8Array | string,
    metadata?: Record<string, any>
  ): Promise<StorageResult> {
    const body = {
      recordId,
      ciphertext:
        typeof ciphertext === "string"
          ? ciphertext
          : Buffer.from(ciphertext).toString("base64"),
      metadata,
    };

    const response = await this.fetch<StorageResult>("/records", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return response.data;
  }

  /**
   * Retrieve ciphertext by CID
   */
  async retrieveCiphertext(cid: string): Promise<Uint8Array> {
    const response = await fetch(`${this.baseUrl}/ciphertext/${cid}`);

    if (!response.ok) {
      throw new Error(`Failed to retrieve ciphertext: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  /**
   * Store wrapped key for grantee
   */
  async storeWrappedKey(
    recordId: string,
    grantee: string,
    wrappedKey: Uint8Array | string,
    expiry: number
  ): Promise<WrappedKeyResult> {
    const body = {
      recordId,
      grantee,
      wrappedKey:
        typeof wrappedKey === "string"
          ? wrappedKey
          : Buffer.from(wrappedKey).toString("base64"),
      expiry,
    };

    const response = await this.fetch<WrappedKeyResult>("/wrapped-keys", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return response.data;
  }

  /**
   * Get audit trail for record
   */
  async getAuditTrail(
    recordId: string,
    fromBlock?: number,
    toBlock?: number | "latest"
  ): Promise<AuditTrail> {
    const params = new URLSearchParams();
    if (fromBlock !== undefined) params.set("fromBlock", fromBlock.toString());
    if (toBlock !== undefined)
      params.set("toBlock", toBlock.toString());

    const query = params.toString();
    const endpoint = `/audit/${recordId}${query ? `?${query}` : ""}`;

    const response = await this.fetch<AuditTrail>(endpoint);
    return response.data;
  }

  /**
   * Get access logs for record
   */
  async getAccessLogs(
    recordId: string,
    fromBlock?: number,
    toBlock?: number | "latest"
  ): Promise<{ recordId: string; totalAccesses: number; logs: any[] }> {
    const params = new URLSearchParams();
    if (fromBlock !== undefined) params.set("fromBlock", fromBlock.toString());
    if (toBlock !== undefined)
      params.set("toBlock", toBlock.toString());

    const query = params.toString();
    const endpoint = `/access-logs/${recordId}${query ? `?${query}` : ""}`;

    const response = await this.fetch<any>(endpoint);
    return response.data;
  }

  /**
   * Get grant history for record
   */
  async getGrantHistory(recordId: string): Promise<{
    recordId: string;
    currentGrants: any[];
    revokedGrants: any[];
    history: any[];
  }> {
    const response = await this.fetch<any>(`/grants/${recordId}`);
    return response.data;
  }

  /**
   * Get address activity
   */
  async getAddressActivity(
    address: string,
    fromBlock?: number,
    toBlock?: number | "latest"
  ): Promise<{ address: string; totalEvents: number; events: any[] }> {
    const params = new URLSearchParams();
    if (fromBlock !== undefined) params.set("fromBlock", fromBlock.toString());
    if (toBlock !== undefined)
      params.set("toBlock", toBlock.toString());

    const query = params.toString();
    const endpoint = `/activity/${address}${query ? `?${query}` : ""}`;

    const response = await this.fetch<any>(endpoint);
    return response.data;
  }

  /**
   * AI analysis request
   */
  async analyzeRecord(
    request: AIAnalysisRequest
  ): Promise<AIAnalysisResult> {
    const response = await this.fetch<AIAnalysisResult>("/ai/analyze", {
      method: "POST",
      body: JSON.stringify(request),
    });

    return response.data;
  }
}

/**
 * Singleton instance
 */
let instance: ShieldApiClient | null = null;

export function getShieldApi(config?: ShieldApiConfig): ShieldApiClient {
  if (!instance) {
    instance = new ShieldApiClient(config);
  }
  return instance;
}

export default ShieldApiClient;
