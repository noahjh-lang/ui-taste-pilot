'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/** Safety for one recipe, keyed per user so it can never leak across accounts. */
export function useRecipeSafety(userId: string, recipeId: string) {
  return useQuery({
    queryKey: queryKeys.recipeSafety(userId, recipeId),
    queryFn: ({ signal }) => api.recipes.safety(recipeId, signal),
  });
}
