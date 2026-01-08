import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/lib/api-client';

interface UseApiQueryOptions<T> {
  initialData?: T;
  enabled?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
}

interface UseApiQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export function useApiQuery<T>(
  endpoint: string,
  options: UseApiQueryOptions<T> = {}
): UseApiQueryResult<T> {
  const { initialData, enabled = true, refetchInterval, onSuccess, onError } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const result = await api.get<T>(endpoint);
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const apiError = err instanceof ApiError 
        ? err 
        : new ApiError('An unexpected error occurred', 0, 'UNKNOWN');
      
      setIsError(true);
      setError(apiError);
      onError?.(apiError);
      console.error(`[useApiQuery] Failed to fetch ${endpoint}:`, apiError);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, enabled, onSuccess, onError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refetchInterval && enabled) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [refetchInterval, enabled, fetchData]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchData,
  };
}

// Mutation hook for POST/PUT/DELETE
interface UseApiMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: ApiError, variables: TVariables) => void;
}

interface UseApiMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | undefined>;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  data: TData | undefined;
  reset: () => void;
}

export function useApiMutation<TData, TVariables>(
  method: 'post' | 'put' | 'patch' | 'delete',
  endpoint: string | ((variables: TVariables) => string),
  options: UseApiMutationOptions<TData, TVariables> = {}
): UseApiMutationResult<TData, TVariables> {
  const { onSuccess, onError } = options;

  const [data, setData] = useState<TData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutate = useCallback(async (variables: TVariables): Promise<TData | undefined> => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    const url = typeof endpoint === 'function' ? endpoint(variables) : endpoint;

    try {
      let result: TData;
      
      if (method === 'delete') {
        result = await api.delete<TData>(url);
      } else {
        result = await api[method]<TData>(url, variables);
      }
      
      setData(result);
      onSuccess?.(result, variables);
      return result;
    } catch (err) {
      const apiError = err instanceof ApiError 
        ? err 
        : new ApiError('An unexpected error occurred', 0, 'UNKNOWN');
      
      setIsError(true);
      setError(apiError);
      onError?.(apiError, variables);
      console.error(`[useApiMutation] Failed ${method} ${url}:`, apiError);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [method, endpoint, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(undefined);
    setIsLoading(false);
    setIsError(false);
    setError(null);
  }, []);

  return {
    mutate,
    isLoading,
    isError,
    error,
    data,
    reset,
  };
}
