import { useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiError } from '@/lib/api-client';

interface UseApiQueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
  fallbackEndpoints?: string[]; // NEW: Try multiple endpoints
}

interface UseApiQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
  actualEndpoint?: string; // NEW: Which endpoint worked
}

export function useApiQuery<T>(
  endpoint: string | string[], // Can now accept array of endpoints
  options: UseApiQueryOptions = {}
): UseApiQueryResult<T> {
  const { enabled = true, refetchInterval, fallbackEndpoints = [] } = options;
  
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [actualEndpoint, setActualEndpoint] = useState<string | undefined>();
  
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    // Build list of endpoints to try
    const endpoints = Array.isArray(endpoint) 
      ? endpoint 
      : [endpoint, ...fallbackEndpoints];

    // Try each endpoint until one succeeds
    for (let i = 0; i < endpoints.length; i++) {
      const currentEndpoint = endpoints[i];
      
      try {
        console.log(`[useApiQuery] Trying endpoint ${i + 1}/${endpoints.length}: ${currentEndpoint}`);
        const result = await api.get<T>(currentEndpoint);
        
        if (isMounted.current) {
          console.log(`[useApiQuery] ✅ Success with: ${currentEndpoint}`);
          setData(result);
          setActualEndpoint(currentEndpoint);
          setIsLoading(false);
          return; // Success - stop trying
        }
      } catch (err) {
        console.warn(`[useApiQuery] ❌ Failed with: ${currentEndpoint}`, err);
        
        // If this is the last endpoint, set error
        if (i === endpoints.length - 1) {
          if (isMounted.current) {
            setIsError(true);
            if (err instanceof ApiError) {
              setError(err);
            } else if (err instanceof Error) {
              setError(new ApiError(err.message, 0, 'UNKNOWN_ERROR'));
            } else {
              setError(new ApiError('All endpoints failed', 0, 'ALL_FAILED'));
            }
            setIsLoading(false);
          }
        }
        // Otherwise, continue to next endpoint
      }
    }
  }, [endpoint, fallbackEndpoints, enabled]);

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
    actualEndpoint,
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
