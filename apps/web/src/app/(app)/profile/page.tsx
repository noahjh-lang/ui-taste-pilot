'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { TasteProfileView } from '@/features/profile';
import { useMe } from '@/lib/session';

function Profile() {
  const me = useMe();
  return <TasteProfileView user={me} welcome={useSearchParams().get('welcome') === '1'} />;
}

export default function ProfilePage() {
  return (
    <Suspense>
      <Profile />
    </Suspense>
  );
}
