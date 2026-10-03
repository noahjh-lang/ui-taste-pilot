import { ApiError } from '@tastepilot/api-client';
import { QueryClient } from '@tanstack/react-query';

const MAX_RETRIES = 3;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Retrying a 4xx won't change the answer; retry network/5xx with backoff.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.isClientError) return false;
          return failureCount < MAX_RETRIES;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      },
    },
  });
}
