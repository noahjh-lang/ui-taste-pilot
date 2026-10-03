'use client';

import { PublicRecipeView } from '@/features/recipes';
import { useRouteParam } from '@/lib/use-route-param';

export function PublicRecipePage() {
  const value = useRouteParam('r');
  return value ? <PublicRecipeView id={value} /> : null;
}
