'use client';

import { SafetyBadge, SafetyReasons } from '@tastepilot/ui';
import { useRecipeSafety } from '../api/queries';

/** Badge plus explanation, straight from the server's safety result. */
export function RecipeSafetyPanel({ userId, recipeId }: { userId: string; recipeId: string }) {
  const { data, isPending, isError, refetch } = useRecipeSafety(userId, recipeId);
  return (
    <section aria-labelledby="safety-heading" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="safety-heading" className="font-semibold">
          Safety for you
        </h2>
        <SafetyBadge
          status={data?.status}
          pending={isPending}
          error={isError}
          onRetry={() => void refetch()}
        />
      </div>
      {data && !isPending && !isError ? (
        <SafetyReasons status={data.status} reasons={data.reasons} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {isError
            ? 'We couldn’t check this recipe. Treat it as unverified until it loads.'
            : 'Checking against your allergies and diet…'}
        </p>
      )}
    </section>
  );
}
