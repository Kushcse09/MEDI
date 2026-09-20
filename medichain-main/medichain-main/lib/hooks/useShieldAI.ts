/**
 * MediChain Shield - AI Hook
 * 
 * Headless hook for AI safety analysis with quarantine handling.
 */

"use client";

import { useState, useCallback } from "react";
import { getShieldApi } from "../shield-client/shieldApi";
import type { AIAnalysisRequest, AIAnalysisResult } from "../shield-client/types";

/**
 * AI analysis state
 */
interface AIAnalysisState {
  result: AIAnalysisResult | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Shield AI hook
 */
export function useShieldAI() {
  const [state, setState] = useState<AIAnalysisState>({
    result: null,
    isLoading: false,
    error: null,
  });

  /**
   * Analyze record for drug interactions
   */
  const analyzeRecord = useCallback(
    async (request: AIAnalysisRequest): Promise<AIAnalysisResult> => {
      setState({
        result: null,
        isLoading: true,
        error: null,
      });

      try {
        const api = getShieldApi();
        const result = await api.analyzeRecord(request);

        setState({
          result,
          isLoading: false,
          error: null,
        });

        return result;
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error("AI analysis failed");
        setState({
          result: null,
          isLoading: false,
          error: err,
        });
        throw err;
      }
    },
    []
  );

  /**
   * Helper: Check if result is quarantined
   */
  const isQuarantined = useCallback((result: AIAnalysisResult | null): boolean => {
    return result?.status === "QUARANTINED";
  }, []);

  /**
   * Helper: Check if result is degraded
   */
  const isDegraded = useCallback((result: AIAnalysisResult | null): boolean => {
    return result?.status === "DEGRADED";
  }, []);

  /**
   * Helper: Get human-readable status message
   */
  const getStatusMessage = useCallback((result: AIAnalysisResult | null): string => {
    if (!result) return "No analysis performed";

    switch (result.status) {
      case "SUCCESS":
        return `Analysis complete (${result.tokensUsed} tokens used)`;
      case "QUARANTINED":
        return `Potential security threat detected: ${result.reason}`;
      case "DEGRADED":
        return `Analysis completed with limitations: ${result.reason}`;
      case "ERROR":
        return `Analysis failed: ${result.reason}`;
      default:
        return "Unknown status";
    }
  }, []);

  /**
   * Helper: Get severity color
   */
  const getSeverityColor = useCallback((severity: string): string => {
    switch (severity) {
      case "none":
        return "green";
      case "low":
        return "yellow";
      case "medium":
        return "orange";
      case "high":
        return "red";
      default:
        return "gray";
    }
  }, []);

  return {
    ...state,
    analyzeRecord,
    isQuarantined,
    isDegraded,
    getStatusMessage,
    getSeverityColor,
  };
}

export default useShieldAI;
