'use client';

import { PublicCookbookView } from '@/features/cookbook';
import { useRouteParam } from '@/lib/use-route-param';

export function PublicCookbookPage() {
  const value = useRouteParam('c');
  return value ? <PublicCookbookView handle={value} /> : null;
}
