import { useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiError } from '@/lib/api-client';

interface UseApiQueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
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
  options: UseApiQueryOptions = {}
): UseApiQueryResult<T> {
  const { enabled = true, refetchInterval } = options;
  
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      console.log(`[useApiQuery] Fetching: ${endpoint}`);
      const result = await api.get<T>(endpoint);
      
      if (isMounted.current) {
        console.log(`[useApiQuery] Success: ${endpoint}`, result);
        setData(result);
        setIsLoading(false);
      }
    } catch (err) {
      console.error(`[useApiQuery] Error: ${endpoint}`, err);
      
      if (isMounted.current) {
        setIsError(true);
        if (err instanceof ApiError) {
          setError(err);
        } else if (err instanceof Error) {
          setError(new ApiError(err.message, 0, 'UNKNOWN_ERROR'));
        } else {
          setError(new ApiError('An unexpected error occurred', 0, 'UNKNOWN_ERROR'));
        }
        setIsLoading(false);
      }
    }
  }, [endpoint, enabled]);

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    fetchData();
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const intervalId = setInterval(fetchData, refetchInterval);
    return () => clearInterval(intervalId);
  }, [refetchInterval, enabled, fetchData]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchData,
  };
}

// Mutation hook
interface UseApiMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: ApiError, variables: TVariables) => void;
}

export function useApiMutation<TData, TVariables = unknown>(
  method: 'post' | 'put' | 'patch' | 'delete',
  endpoint: string | ((variables: TVariables) => string),
  options: UseApiMutationOptions<TData, TVariables> = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<TData | undefined>(undefined);

  const mutate = useCallback(async (variables: TVariables): Promise<TData | undefined> => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    const url = typeof endpoint === 'function' ? endpoint(variables) : endpoint;

    try {
      let result: TData;
      
      switch (method) {
        case 'post':
          result = await api.post<TData>(url, variables);
          break;
        case 'put':
          result = await api.put<TData>(url, variables);
          break;
        case 'patch':
          result = await api.patch<TData>(url, variables);
          break;
        case 'delete':
          result = await api.delete<TData>(url);
          break;
      }

      setData(result);
      options.onSuccess?.(result, variables);
      return result;
    } catch (err) {
      const apiError = err instanceof ApiError 
        ? err 
        : new ApiError('Mutation failed', 0, 'MUTATION_ERROR');
      
      setIsError(true);
      setError(apiError);
      options.onError?.(apiError, variables);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [method, endpoint, options]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsError(false);
    setError(null);
    setData(undefined);
  }, []);

  return { mutate, isLoading, isError, error, data, reset };
}

export { ApiError };
