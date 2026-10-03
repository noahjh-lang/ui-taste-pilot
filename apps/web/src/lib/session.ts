'use client';

import type { Me } from '@tastepilot/api-client';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { queryKeys } from './query-keys';

/** Current session; `user` is null when signed out. Shared by every feature. */
export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: ({ signal }) => api.auth.session(signal),
    staleTime: 5 * 60_000,
  });
}

/** The signed-in user. Only use inside the authenticated app shell. */
export function useMe(): Me {
  const { data } = useSession();
  if (!data?.user) throw new Error('useMe() called outside an authenticated route');
  return data.user;
}
