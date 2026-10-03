'use client';

import type { RankedRecipe } from '@tastepilot/api-client';
import { RecipeCard, RecipeGrid, Skeleton } from '@tastepilot/ui';
import Link from 'next/link';
import { track } from '@/lib/events';
import { usePrefetchRecipe } from '../api/queries';

export function RankedRecipeGrid({ items, surface }: { items: RankedRecipe[]; surface: string }) {
  const prefetch = usePrefetchRecipe();
  return (
    <RecipeGrid>
      {items.map((item, index) => (
        <div
          key={item.recipe.id}
          onMouseEnter={() => prefetch(item.recipe.id)}
          onFocus={() => prefetch(item.recipe.id)}
        >
          <RecipeCard
            recipe={item.recipe}
            href={`/recipes/${item.recipe.id}`}
            LinkComponent={Link}
            safety={{ status: item.safety.status }}
            score={item.score.total}
            meta={
              item.pantryMatch.total > 0 && item.pantryMatch.have > 0 ? (
                <span>
                  {item.pantryMatch.have}/{item.pantryMatch.total} in pantry
                </span>
              ) : null
            }
            onNavigate={() =>
              track('recommendation_clicked', {
                surface,
                recipeId: item.recipe.id,
                position: index,
              })
            }
          />
        </div>
      ))}
    </RecipeGrid>
  );
}

export function RecipeGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <RecipeGrid>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-60 w-full rounded-xl" />
      ))}
    </RecipeGrid>
  );
}
