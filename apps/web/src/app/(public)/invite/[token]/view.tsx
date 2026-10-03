'use client';

import { InviteLanding } from '@/features/meal-party';
import { ParsePreview } from '@/features/profile';
import { useRouteParam } from '@/lib/use-route-param';

export function InvitePage() {
  const token = useRouteParam('invite');
  return token ? (
    <InviteLanding token={token} renderParsePreview={(r) => <ParsePreview result={r} />} />
  ) : null;
}
