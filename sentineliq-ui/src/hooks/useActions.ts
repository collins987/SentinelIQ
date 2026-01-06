import { useState, useCallback } from 'react';
import { toast } from '../components/ui/toast';

/**
 * Custom hook for handling async actions with loading states and toast feedback
 */
export function useAsyncAction<T = void>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    action: () => Promise<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await action();
      if (options?.successMessage) {
        toast('success', options.successMessage);
      }
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      toast('error', options?.errorMessage || 'Action failed', errorMsg);
      options?.onError?.(err instanceof Error ? err : new Error(errorMsg));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { execute, isLoading, error };
}

/**
 * Simulate API delay for mock operations
 */
export const simulateApiDelay = (ms: number = 800): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Copy text to clipboard with toast feedback
 */
export async function copyToClipboard(text: string, label: string = 'Content'): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast('success', `${label} copied`, 'Copied to clipboard');
    return true;
  } catch (err) {
    toast('error', 'Failed to copy', 'Could not copy to clipboard');
    return false;
  }
}

/**
 * Export data as JSON file download
 */
export function exportToJson<T>(data: T, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast('success', 'Export complete', `Downloaded ${filename}.json`);
}

/**
 * Export data as CSV file download
 */
export function exportToCsv<T extends Record<string, unknown>>(
  data: T[], 
  filename: string,
  columns?: { key: keyof T; label: string }[]
): void {
  if (data.length === 0) {
    toast('warning', 'No data to export');
    return;
  }

  const keys = columns?.map(c => c.key) || (Object.keys(data[0]) as (keyof T)[]);
  const headers = columns?.map(c => c.label) || keys.map(String);

  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      keys.map(key => {
        const value = row[key];
        const stringValue = value === null || value === undefined ? '' : String(value);
        // Escape quotes and wrap in quotes if contains comma
        return stringValue.includes(',') || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast('success', 'Export complete', `Downloaded ${filename}.csv`);
}
