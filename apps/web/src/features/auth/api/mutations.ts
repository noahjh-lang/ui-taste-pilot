'use client';

import type { ClaimInput, LoginInput, SignupInput } from '@tastepilot/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { track } from '@/lib/events';
import { queryKeys } from '@/lib/query-keys';

/** Signing in or out changes whose data everything is: start from a clean cache. */
function useResetTo() {
  const qc = useQueryClient();
  return (session: Awaited<ReturnType<typeof api.auth.session>>) => {
    qc.clear();
    qc.setQueryData(queryKeys.session, session);
  };
}

export function useLogin() {
  const resetTo = useResetTo();
  return useMutation({
    mutationFn: (input: LoginInput) => api.auth.login(input),
    onSuccess: (session) => {
      resetTo(session);
      track('login_succeeded');
    },
  });
}

export function useSignup() {
  const resetTo = useResetTo();
  return useMutation({
    mutationFn: (input: SignupInput) => api.auth.signup(input),
    onSuccess: (session) => {
      resetTo(session);
      track('signup_completed');
    },
  });
}

export function useLogout() {
  const resetTo = useResetTo();
  return useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: () => resetTo({ user: null }),
  });
}

/** Lite to full: same account, so nothing else in the cache changes. */
export function useClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClaimInput) => api.auth.claim(input),
    onSuccess: (session) => {
      qc.setQueryData(queryKeys.session, session);
      track('claim_completed');
    },
  });
}
