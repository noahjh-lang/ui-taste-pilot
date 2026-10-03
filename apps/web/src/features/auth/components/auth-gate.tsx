'use client';

import type { Me } from '@tastepilot/api-client';
import { Skeleton } from '@tastepilot/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useSession } from '@/lib/session';

/** Where a guest (lite account) is allowed to go: only their own party. */
export function guestAllowed(user: Me, pathname: string) {
  if (user.kind === 'full') return true;
  const own = `/party/${user.liteForPartyId}`;
  return pathname === own || pathname.startsWith(`${own}/`);
}

/**
 * Client-side route guard for the authenticated app. The backend enforces the
 * same rules on every request; this only keeps people on pages they can use.
 * (The static export has no server middleware to do this earlier.)
 */
export function AuthGate({ children }: { children: (user: Me) => ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const user = session.data?.user ?? null;

  useEffect(() => {
    if (session.isPending) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (!guestAllowed(user, pathname)) {
      router.replace(`/party/${user.liteForPartyId}`);
    }
  }, [session.isPending, user, pathname, router]);

  if (session.isPending || !user || !guestAllowed(user, pathname)) {
    return (
      <div className="space-y-4 p-6" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  return <>{children(user)}</>;
}
