'use client';

import { Button, toast } from '@tastepilot/ui';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { track } from '@/lib/events';
import { errorMessage } from '@/lib/query-client';
import { useRecoverIdentity } from '../api/queries';

/**
 * Soft, dismissible "did you already join as …?" hint. Joining is never
 * blocked; this only offers to reconnect to an existing guest identity.
 */
export function DuplicateHint({ partyId }: { partyId: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const recover = useRecoverIdentity(partyId);
  const userId = params.get('possibleDuplicate');
  const name = params.get('name');
  if (!userId || !name) return null;

  const clear = () => router.replace(pathname, { scroll: false });

  return (
    <aside
      role="status"
      className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/60 p-4 text-sm"
    >
      <p className="flex-1">
        Did you already join as <strong>{name}</strong>, maybe on another device?
      </p>
      <Button
        size="sm"
        loading={recover.isPending}
        onClick={() =>
          recover.mutate(userId, {
            onSuccess: () => {
              toast(`Welcome back, ${name}`);
              clear();
            },
            onError: (e) => toast('Couldn’t reconnect', errorMessage(e)),
          })
        }
      >
        Yes, that’s me
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          track('duplicate_hint_dismissed', {}, partyId);
          clear();
        }}
      >
        No, I’m new
      </Button>
    </aside>
  );
}
