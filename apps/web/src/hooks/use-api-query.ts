"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

import { createApiClient, type ApiClientError } from "@/lib/api-client";

export interface UseApiQueryOptions {
  enabled?: boolean;
  deps?: unknown[];
}

export interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  apiError: ApiClientError | null;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useApiQuery<T>(
  queryFn: (client: ReturnType<typeof createApiClient>, token: string) => Promise<T>,
  options: UseApiQueryOptions = {},
): UseApiQueryResult<T> {
  const { enabled = true, deps = [] } = options;
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiClientError | null>(null);

  const queryFnRef = useRef(queryFn);

  useEffect(() => {
    queryFnRef.current = queryFn;
  });

  const fetchQuery = useCallback(async () => {
    if (!enabled || !isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setApiError(null);

      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const client = createApiClient(apiUrl);
      const result = await queryFnRef.current(client, token);
      setData(result);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "name" in err && err.name === "ApiClientError") {
        const cErr = err as ApiClientError;
        setApiError(cErr);
        setError(cErr.message);
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      if (!enabled || !isLoaded || !isSignedIn) return;
      try {
        setLoading(true);
        setError(null);
        setApiError(null);

        const token = await getToken();
        if (!token || !isMounted) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const client = createApiClient(apiUrl);
        const result = await queryFnRef.current(client, token);
        if (isMounted) {
          setData(result);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        if (err && typeof err === "object" && "name" in err && err.name === "ApiClientError") {
          const cErr = err as ApiClientError;
          setApiError(cErr);
          setError(cErr.message);
        } else {
          setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void run();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isLoaded, isSignedIn, getToken, ...deps]);

  return {
    data,
    loading,
    error,
    apiError,
    refetch: fetchQuery,
    setData,
  };
}
