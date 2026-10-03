'use client';

import { Skeleton } from '@tastepilot/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClaimForm } from '@/features/auth';
import { useSession } from '@/lib/session';

/** Lite (guest) account to full account. Same account: history and parties carry over. */
export default function ClaimPage() {
  const session = useSession();
  const router = useRouter();
  const user = session.data?.user;
  // After a successful claim the user becomes "full"; that must not bounce
  // them to /home while we're redirecting to the welcome page.
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (session.isPending || claimed) return;
    if (!user) router.replace('/login');
    else if (user.kind === 'full') router.replace('/home');
  }, [session.isPending, user, claimed, router]);

  if (!user || (user.kind !== 'lite' && !claimed)) return <Skeleton className="h-48 w-full" />;
  const partyHref = user.liteForPartyId ? `/party/${user.liteForPartyId}` : '/party';
  return (
    <>
      <h1 className="text-2xl font-semibold">Save your profile</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Hi {user.name}! Add an email and password to keep your allergies, preferences and parties.
        Nothing you’ve added is lost.
      </p>
      <ClaimForm
        onDone={() => {
          setClaimed(true);
          router.replace('/profile?welcome=1');
        }}
      />
      <p className="mt-4 text-center text-sm">
        <Link href={partyHref} className="text-muted-foreground underline">
          Not now, back to the party
        </Link>
      </p>
    </>
  );
}
