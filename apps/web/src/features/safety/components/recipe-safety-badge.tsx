'use client';

import { SafetyBadge } from '@tastepilot/ui';
import { useRecipeSafety } from '../api/queries';

/** Wires the recipe safety query into the shared SafetyBadge. */
export function RecipeSafetyBadge({ recipeId }: { recipeId: string }) {
  const { data, isPending, isError, refetch } = useRecipeSafety(recipeId);

  return (
    <SafetyBadge
      status={data?.status}
      pending={isPending}
      error={isError}
      onRetry={() => void refetch()}
    />
  );
}
