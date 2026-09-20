/**
 * MediChain Shield - Audit Hook
 * 
 * Headless hook for querying audit trails and access logs.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { getShieldApi } from "../shield-client/shieldApi";
import type { AuditTrail, HookOptions } from "../shield-client/types";

/**
 * Audit state
 */
interface AuditState {
  data: AuditTrail | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Shield audit hook
 */
export function useShieldAudit(
  recordId: string | null,
  options: HookOptions = {}
) {
  const { enabled = true, refetchInterval, onSuccess, onError } = options;

  const [state, setState] = useState<AuditState>({
    data: null,
    isLoading: false,
    error: null,
  });

  /**
   * Fetch audit trail
   */
  const fetchAudit = useCallback(
    async (fromBlock?: number, toBlock?: number | "latest") => {
      if (!recordId || !enabled) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const api = getShieldApi();
        const auditTrail = await api.getAuditTrail(recordId, fromBlock, toBlock);

        setState({
          data: auditTrail,
          isLoading: false,
          error: null,
        });

        onSuccess?.(auditTrail);
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Audit fetch failed");
        setState({
          data: null,
          isLoading: false,
          error: err,
        });
        onError?.(err);
      }
    },
    [recordId, enabled, onSuccess, onError]
  );

  /**
   * Fetch access logs only
   */
  const fetchAccessLogs = useCallback(
    async (fromBlock?: number, toBlock?: number | "latest") => {
      if (!recordId) return null;

      const api = getShieldApi();
      return await api.getAccessLogs(recordId, fromBlock, toBlock);
    },
    [recordId]
  );

  /**
   * Fetch grant history
   */
  const fetchGrantHistory = useCallback(async () => {
    if (!recordId) return null;

    const api = getShieldApi();
    return await api.getGrantHistory(recordId);
  }, [recordId]);

  /**
   * Auto-fetch on mount and when recordId changes
   */
  useEffect(() => {
    if (enabled && recordId) {
      fetchAudit();
    }
  }, [recordId, enabled, fetchAudit]);

  /**
   * Auto-refetch interval
   */
  useEffect(() => {
    if (!refetchInterval || !enabled || !recordId) return;

    const interval = setInterval(() => {
      fetchAudit();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled, recordId, fetchAudit]);

  return {
    ...state,
    refetch: fetchAudit,
    fetchAccessLogs,
    fetchGrantHistory,
  };
}

/**
 * Hook for address activity
 */
export function useAddressActivity(
  address: string | null,
  options: HookOptions = {}
) {
  const { enabled = true, refetchInterval, onSuccess, onError } = options;

  const [state, setState] = useState<{
    data: any;
    isLoading: boolean;
    error: Error | null;
  }>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetchActivity = useCallback(
    async (fromBlock?: number, toBlock?: number | "latest") => {
      if (!address || !enabled) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const api = getShieldApi();
        const activity = await api.getAddressActivity(address, fromBlock, toBlock);

        setState({
          data: activity,
          isLoading: false,
          error: null,
        });

        onSuccess?.(activity);
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error("Activity fetch failed");
        setState({
          data: null,
          isLoading: false,
          error: err,
        });
        onError?.(err);
      }
    },
    [address, enabled, onSuccess, onError]
  );

  useEffect(() => {
    if (enabled && address) {
      fetchActivity();
    }
  }, [address, enabled, fetchActivity]);

  useEffect(() => {
    if (!refetchInterval || !enabled || !address) return;

    const interval = setInterval(() => {
      fetchActivity();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled, address, fetchActivity]);

  return {
    ...state,
    refetch: fetchActivity,
  };
}

export default useShieldAudit;
