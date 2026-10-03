'use client';

import type { Me } from '@tastepilot/api-client';
import { Button } from '@tastepilot/ui';
import { X } from 'lucide-react';
import Link from 'next/link';
import { track } from '@/lib/events';
import { useClaimPrompt } from '@/lib/stores';

/** Low-pressure, dismissible nudge for guests. Never a wall. */
export function SaveProfilePrompt({ user }: { user: Me }) {
  const { dismissed, dismiss } = useClaimPrompt();
  if (user.kind !== 'lite' || dismissed) return null;
  return (
    <aside
      aria-label="Save your profile"
      className="mb-6 flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/10 p-4"
    >
      <div className="flex-1 text-sm">
        <p className="font-medium">Save your profile?</p>
        <p className="mt-0.5 text-muted-foreground">
          Add an email and password to keep your allergies and this party on any device. Everything
          you’ve added comes with you.
        </p>
      </div>
      <Button asChild size="sm">
        <Link href="/claim">Save profile</Link>
      </Button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          dismiss();
          track('claim_prompt_dismissed');
        }}
        className="-m-1 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
      >
        <X className="size-4" aria-hidden />
      </button>
    </aside>
  );
}
