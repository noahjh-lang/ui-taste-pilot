import { ApiError } from '@tastepilot/api-client';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

const MAX_RETRIES = 3;

export function createQueryClient() {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => handleAuthError(queryClient, error),
    }),
    mutationCache: new MutationCache({
      onError: (error) => handleAuthError(queryClient, error),
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Retrying a 4xx won't change the answer; retry network/5xx with backoff.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.isClientError) return false;
          return failureCount < MAX_RETRIES;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      },
      mutations: { retry: false },
    },
  });
  return queryClient;
}

/**
 * A 401 anywhere means the session is gone: clear it, and the route guard
 * sends the user to sign in (or a guest back to their party).
 */
function handleAuthError(queryClient: QueryClient, error: unknown) {
  if (error instanceof ApiError && error.isUnauthorized && error.path !== '/auth/login') {
    queryClient.setQueryData(queryKeys.session, { user: null });
  }
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status >= 500)
      return 'The server is having trouble. Please try again in a moment.';
    return error.message;
  }
  if (error instanceof TypeError) return "Can't reach TastePilot. Check your connection.";
  return fallback;
}
