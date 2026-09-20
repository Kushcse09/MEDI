import { useState } from 'react';
import { accessAPI } from './api';

export interface AccessGrant {
  recordId: string;
  provider: string;
  expiresAt: number;
}

export function useAccess() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grantAccess = async (recordId: string, provider: string, durationDays: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + (durationDays * 24 * 60 * 60);
      const result = await accessAPI.grantAccess(recordId, provider, expiresAt);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to grant access');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const revokeAccess = async (recordId: string, provider: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await accessAPI.revokeAccess(recordId, provider);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to revoke access');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const checkAccess = async (recordId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await accessAPI.checkAccess(recordId);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to check access');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    grantAccess,
    revokeAccess,
    checkAccess,
  };
}
