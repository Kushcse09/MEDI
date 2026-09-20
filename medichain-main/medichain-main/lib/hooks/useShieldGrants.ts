/**
 * MediChain Shield - Grants Hook
 * 
 * Headless hook for managing access grants to medical records.
 * Integrates with AccessRegistry contract.
 */

"use client";

import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { AccessRegistryClient } from "../shield-client/registryContract";
import { getShieldApi } from "../shield-client/shieldApi";
import { wrapKey } from "../crypto";
import type { TransactionState } from "../shield-client/types";

/**
 * Grant state
 */
interface GrantState {
  isLoading: boolean;
  transaction: TransactionState;
  error: Error | null;
}

/**
 * Shield grants hook
 */
export function useShieldGrants() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [grantState, setGrantState] = useState<GrantState>({
    isLoading: false,
    transaction: { status: "idle" },
    error: null,
  });

  const [revokeState, setRevokeState] = useState<GrantState>({
    isLoading: false,
    transaction: { status: "idle" },
    error: null,
  });

  /**
   * Grant access to a record
   */
  const grantAccess = useCallback(
    async (
      recordId: string,
      granteeAddress: string,
      granteePublicKey: Uint8Array,
      recordKey: Uint8Array,
      expiryTimestamp: number
    ) => {
      if (!publicClient || !walletClient) {
        throw new Error("Wallet not connected");
      }

      setGrantState({
        isLoading: true,
        transaction: { status: "idle" },
        error: null,
      });

      try {
        // Step 1: Wrap record key for grantee
        const wrappedKey = await wrapKey(recordKey, granteePublicKey);

        // Step 2: Upload wrapped key to storage
        const api = getShieldApi();
        const wrappedKeyResult = await api.storeWrappedKey(
          recordId,
          granteeAddress,
          wrappedKey,
          expiryTimestamp
        );

        // Step 3: Grant access on-chain
        const registry = new AccessRegistryClient(publicClient, walletClient);

        const txState = await registry.grantAccess(
          recordId,
          granteeAddress,
          expiryTimestamp,
          wrappedKeyResult.wrappedKeyCid,
          (state) => {
            setGrantState((prev) => ({
              ...prev,
              transaction: state,
            }));
          }
        );

        setGrantState({
          isLoading: false,
          transaction: txState,
          error: txState.status === "error" ? new Error(txState.error) : null,
        });

        return txState;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Grant failed");
        setGrantState({
          isLoading: false,
          transaction: { status: "error", error: err.message },
          error: err,
        });
        throw err;
      }
    },
    [publicClient, walletClient]
  );

  /**
   * Revoke access to a record
   */
  const revokeAccess = useCallback(
    async (recordId: string, granteeAddress: string) => {
      if (!publicClient || !walletClient) {
        throw new Error("Wallet not connected");
      }

      setRevokeState({
        isLoading: false,
        transaction: { status: "idle" },
        error: null,
      });

      try {
        const registry = new AccessRegistryClient(publicClient, walletClient);

        const txState = await registry.revokeAccess(
          recordId,
          granteeAddress,
          (state) => {
            setRevokeState((prev) => ({
              ...prev,
              transaction: state,
            }));
          }
        );

        setRevokeState({
          isLoading: false,
          transaction: txState,
          error: txState.status === "error" ? new Error(txState.error) : null,
        });

        return txState;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Revoke failed");
        setRevokeState({
          isLoading: false,
          transaction: { status: "error", error: err.message },
          error: err,
        });
        throw err;
      }
    },
    [publicClient, walletClient]
  );

  /**
   * Check if address is authorized
   */
  const checkAuthorization = useCallback(
    async (recordId: string, accessorAddress: string): Promise<boolean> => {
      if (!publicClient) {
        throw new Error("Provider not available");
      }

      const registry = new AccessRegistryClient(publicClient);
      return await registry.isAuthorized(recordId, accessorAddress);
    },
    [publicClient]
  );

  /**
   * Get grant details
   */
  const getGrant = useCallback(
    async (recordId: string, granteeAddress: string) => {
      if (!publicClient) {
        throw new Error("Provider not available");
      }

      const registry = new AccessRegistryClient(publicClient);
      return await registry.getGrant(recordId, granteeAddress);
    },
    [publicClient]
  );

  return {
    grantAccess,
    revokeAccess,
    checkAuthorization,
    getGrant,
    grantState,
    revokeState,
  };
}

export default useShieldGrants;
