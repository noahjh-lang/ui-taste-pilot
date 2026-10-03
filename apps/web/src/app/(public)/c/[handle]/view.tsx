'use client';

import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';
import { useRouteParam } from '@/lib/use-route-param';

export function PublicCookbookView() {
  const handle = useRouteParam('c');
  return (
    <>
      <PageHeader title="Cookbook" description={handle ? `@${handle}` : undefined} />
      <Placeholder feature="Public community cookbook" />
    </>
  );
}
