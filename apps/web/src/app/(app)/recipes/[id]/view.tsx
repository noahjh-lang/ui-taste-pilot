'use client';

import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';
import { RecipeSafetyBadge } from '@/features/safety';
import { useRouteParam } from '@/lib/use-route-param';

export function RecipeDetailView() {
  const id = useRouteParam('recipes');
  return (
    <>
      <PageHeader title={id ? `Recipe ${id}` : 'Recipe'} />
      {id && (
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Safety for you:</span>
          <RecipeSafetyBadge recipeId={id} />
        </div>
      )}
      <Placeholder feature="Recipe detail" />
    </>
  );
}
