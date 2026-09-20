import { useState, useEffect } from 'react';
import { recordsAPI, auditAPI } from './api';

export interface Record {
  recordId: string;
  filename: string;
  cid: string;
  createdAt: number;
}

export interface AuditEvent {
  event: string;
  timestamp: number;
  actor?: string;
}

export function useRecords(autoFetch = false) {
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await recordsAPI.getMyRecords();
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch records');
      console.error('Error fetching records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadRecord = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await recordsAPI.uploadRecord(file);
      await fetchRecords(); // Refresh list
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to upload record');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getRecord = async (recordId: string) => {
    try {
      return await recordsAPI.getRecord(recordId);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch record');
      throw err;
    }
  };

  const getAuditTrail = async (recordId: string) => {
    try {
      return await auditAPI.getAuditTrail(recordId);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit trail');
      throw err;
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchRecords();
    }
  }, [autoFetch]);

  return {
    records,
    isLoading,
    error,
    fetchRecords,
    uploadRecord,
    getRecord,
    getAuditTrail,
  };
}
