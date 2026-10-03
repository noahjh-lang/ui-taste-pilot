'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { track } from '@/lib/events';
import { invalidateTasteDependents, queryKeys } from '@/lib/query-keys';

export const useTasteProfile = () =>
  useQuery({ queryKey: queryKeys.profile, queryFn: ({ signal }) => api.profile.get(signal) });

export const usePreferenceDetail = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.preference(id ?? ''),
    queryFn: ({ signal }) => api.profile.preference(id ?? '', signal),
    enabled: !!id,
  });

export const useConstraintOptions = () =>
  useQuery({
    queryKey: queryKeys.constraintOptions,
    queryFn: ({ signal }) => api.profile.constraintOptions(signal),
    staleTime: Infinity,
  });

export const useParseStatement = () =>
  useMutation({ mutationFn: (text: string) => api.profile.parseStatement(text) });

/**
 * Profile edits change constraints or preferences, which feed safety and
 * ranking everywhere. No optimistic updates: we wait for the server's
 * answer, then refetch everything that depends on it.
 */
function useProfileMutation<T>(
  fn: (input: T) => ReturnType<typeof api.profile.get>,
  event: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (profile) => {
      qc.setQueryData(queryKeys.profile, profile);
      track(event);
      return invalidateTasteDependents(qc);
    },
  });
}

export const useApplyStatement = () =>
  useProfileMutation((text: string) => api.profile.applyStatement(text), 'statement_applied');
export const useAddConstraint = () =>
  useProfileMutation(api.profile.addConstraint, 'constraint_added');
export const useRemoveConstraint = () =>
  useProfileMutation(api.profile.removeConstraint, 'constraint_removed');
export const useSetPreference = () =>
  useProfileMutation(api.profile.setPreference, 'preference_set');
export const useRemovePreference = () =>
  useProfileMutation(api.profile.removePreference, 'preference_removed');

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.me.updateSettings,
    onSuccess: (session) => {
      qc.setQueryData(queryKeys.session, session);
      void qc.invalidateQueries({ queryKey: ['party'] });
    },
  });
}

export const useExportData = () => useMutation({ mutationFn: () => api.me.exportData() });

export function useDeleteData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.me.deleteData(),
    onSuccess: () =>
      invalidateTasteDependents(qc).then(() =>
        qc.invalidateQueries({ queryKey: queryKeys.foodLogs }),
      ),
  });
}
