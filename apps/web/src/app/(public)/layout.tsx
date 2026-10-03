'use client';

import { Button } from '@tastepilot/ui';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { useSession } from '@/lib/session';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const user = session.data?.user;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
          <Link href="/" className="font-semibold text-brand">
            TastePilot
          </Link>
          <nav aria-label="Account" className="flex items-center gap-2 text-sm">
            <span className="hidden sm:block">
              <ThemeToggle />
            </span>
            {user ? (
              <Button asChild size="sm">
                <Link href={user.kind === 'full' ? '/home' : `/party/${user.liteForPartyId}`}>
                  Open TastePilot
                </Link>
              </Button>
            ) : (
              <>
                <Link href="/login" className="inline-flex min-h-11 items-center px-2">
                  Log in
                </Link>
                <Button asChild size="sm">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        {children}
      </main>
    </div>
  );
}
