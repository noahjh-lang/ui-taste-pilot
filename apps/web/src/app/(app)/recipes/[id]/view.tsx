'use client';

import { Button } from '@tastepilot/ui';
import { ChefHat } from 'lucide-react';
import { AddToCalendarButton } from '@/features/calendar';
import { RecipePosts } from '@/features/cookbook';
import { LogMealDialog } from '@/features/food-history';
import { AddToPotluckButton } from '@/features/meal-party';
import { RecipeDetailView } from '@/features/recipes';
import { RecipeSafetyPanel } from '@/features/safety';
import { useRouteParam } from '@/lib/use-route-param';
import { useMe } from '@/lib/session';

/** Composes the recipe page from several features; none of them import each other. */
export function RecipeDetailPageView() {
  const id = useRouteParam('recipes');
  const me = useMe();
  if (!id) return null;
  return (
    <RecipeDetailView
      id={id}
      safety={<RecipeSafetyPanel userId={me.id} recipeId={id} />}
      community={<RecipePosts recipeId={id} />}
      actions={(detail) => (
        <>
          <LogMealDialog
            recipe={{ id, title: detail.recipe.title }}
            trigger={
              <Button size="sm" variant="secondary">
                <ChefHat className="size-4" aria-hidden /> I cooked this
              </Button>
            }
          />
          {me.householdId && <AddToCalendarButton recipeId={id} />}
          <AddToPotluckButton recipeId={id} title={detail.recipe.title} />
        </>
      )}
    />
  );
}
