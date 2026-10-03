import { safetyResultSchema } from '@tastepilot/api-client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { safetyKeys } from './keys';

export function useRecipeSafety(recipeId: string) {
  return useQuery({
    queryKey: safetyKeys.recipe(recipeId),
    queryFn: ({ signal }) =>
      api.request(`/recipes/${encodeURIComponent(recipeId)}/safety`, {
        schema: safetyResultSchema,
        signal,
      }),
  });
}
