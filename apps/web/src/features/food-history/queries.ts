'use client';

import type { FoodLogInput } from '@tastepilot/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { track } from '@/lib/events';
import { invalidateTasteDependents, queryKeys } from '@/lib/query-keys';

export const useFoodLogs = () =>
  useQuery({ queryKey: queryKeys.foodLogs, queryFn: ({ signal }) => api.foodLogs.list(signal) });

/** Logging feeds preference evidence, so recommendations refetch too. */
export function useLogMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FoodLogInput) => api.foodLogs.create(input),
    onSuccess: (log) => {
      track('food_logged', { kind: log.kind, rating: log.rating });
      void qc.invalidateQueries({ queryKey: queryKeys.foodLogs });
      return invalidateTasteDependents(qc);
    },
  });
}

/** Removing a log recomputes the affected preferences from what's left. */
export function useDeleteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.foodLogs.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.foodLogs });
      return invalidateTasteDependents(qc);
    },
  });
}
