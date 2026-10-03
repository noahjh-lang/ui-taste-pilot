'use client';

import { Suspense } from 'react';
import { SaveProfilePrompt } from '@/features/auth';
import { PartyView } from '@/features/meal-party';
import { DietaryNeedsEditor } from '@/features/profile';
import { useMe } from '@/lib/session';
import { useRouteParam } from '@/lib/use-route-param';

export function PartyPageView() {
  const id = useRouteParam('party');
  const me = useMe();
  if (!id) return null;
  return (
    <Suspense>
      <PartyView
        id={id}
        user={me}
        banner={<SaveProfilePrompt user={me} />}
        myDietaryNeeds={<DietaryNeedsEditor />}
      />
    </Suspense>
  );
}
