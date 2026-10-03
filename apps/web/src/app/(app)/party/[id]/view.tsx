'use client';

import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';
import { useRouteParam } from '@/lib/use-route-param';

export function PartyView() {
  const id = useRouteParam('party');
  return (
    <>
      <PageHeader title="Meal Party" description={id ? `Party ${id}` : undefined} />
      <Placeholder feature="Meal Party host dashboard" />
    </>
  );
}
