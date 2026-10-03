'use client';

import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';
import { useRouteParam } from '@/lib/use-route-param';

export function PublicRecipeView() {
  const id = useRouteParam('r');
  return (
    <>
      <PageHeader title="Recipe" description={id ? `Public recipe ${id}` : undefined} />
      <Placeholder feature="Public recipe page" />
    </>
  );
}
