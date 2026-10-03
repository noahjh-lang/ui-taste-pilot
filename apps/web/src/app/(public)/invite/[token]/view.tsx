'use client';

import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';
import { useRouteParam } from '@/lib/use-route-param';

export function InviteLandingView() {
  const token = useRouteParam('invite');
  return (
    <>
      <PageHeader
        title="You're invited to a Meal Party"
        description={token ? `Invite ${token}` : undefined}
      />
      <Placeholder feature="Invite acceptance / lite-account join" />
    </>
  );
}
