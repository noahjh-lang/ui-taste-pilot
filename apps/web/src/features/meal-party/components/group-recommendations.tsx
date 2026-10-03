'use client';

import type { GroupRecommendations } from '@tastepilot/api-client';
import { Card, CardHeader, RecipeCard, RecipeGrid, Skeleton } from '@tastepilot/ui';
import Link from 'next/link';
import { QueryState } from '@/components/query-state';
import { track } from '@/lib/events';
import type { UseQueryResult } from '@tanstack/react-query';

/** Recipes that work for the whole group, or a diagnosis when none do. */
export function GroupRecommendationsCard({
  query,
  canOpenRecipes,
  partyId,
}: {
  query: UseQueryResult<GroupRecommendations>;
  canOpenRecipes: boolean;
  partyId: string;
}) {
  return (
    <Card>
      <CardHeader
        title="Recipes for the whole group"
        description="Anything that conflicts with any member is excluded outright, not just ranked lower."
      />
      <div className="p-4 sm:p-5">
        <QueryState
          query={query}
          loading={<Skeleton className="h-40 w-full" />}
          errorTitle="Couldn’t load group recipes"
        >
          {(data) =>
            data.diagnosis ? (
              <div
                role="status"
                className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm"
              >
                <p className="font-medium">{data.diagnosis.message}</p>
                <ul className="list-disc space-y-1 pl-5">
                  {data.diagnosis.blockers.map((b) => (
                    <li key={b.label}>
                      <strong>{b.label}</strong> ({b.memberNames.join(', ')}) rules out{' '}
                      {b.excludedCount} recipes
                    </li>
                  ))}
                </ul>
                <p>{data.diagnosis.suggestion}</p>
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  {data.results.length} recipes fit everyone · {data.excludedCount} excluded for
                  someone’s allergy, diet or a stated dislike
                </p>
                <RecipeGrid>
                  {data.results.slice(0, 6).map((r) => (
                    <RecipeCard
                      key={r.recipe.id}
                      recipe={r.recipe}
                      href={canOpenRecipes ? `/recipes/${r.recipe.id}` : '#potluck'}
                      LinkComponent={canOpenRecipes ? Link : 'a'}
                      safety={{ status: r.safety.status }}
                      score={r.score.total}
                      onNavigate={() =>
                        track('group_recommendation_clicked', { recipeId: r.recipe.id }, partyId)
                      }
                    />
                  ))}
                </RecipeGrid>
              </>
            )
          }
        </QueryState>
      </div>
    </Card>
  );
}
