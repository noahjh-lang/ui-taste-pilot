'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { acceptInviteInputSchema, ApiError, type StatementParse } from '@tastepilot/api-client';
import { formatDate } from '@tastepilot/shared';
import { Button, Card, ErrorState, Field, Input, Skeleton, Textarea, toast } from '@tastepilot/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { QueryState } from '@/components/query-state';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/query-client';
import { useSession } from '@/lib/session';
import { useAcceptInvite, useInvitePreview } from '../api/queries';

const guestSchema = acceptInviteInputSchema.extend({
  name: z.string().trim().min(1, 'Tell the host your name').max(60),
});

function acceptError(error: unknown) {
  if (
    error instanceof ApiError &&
    (error.code === 'invite_revoked' || error.code === 'invite_exhausted')
  ) {
    return error.message + ' Ask the host for a new link.';
  }
  return errorMessage(error);
}

/**
 * Joining a party. Guests never "sign up": they confirm a name and any
 * allergy or diet, and a lightweight guest account is created for them.
 */
export function InviteLanding({
  token,
  renderParsePreview,
}: {
  token: string;
  renderParsePreview: (r: StatementParse) => ReactNode;
}) {
  const router = useRouter();
  const preview = useInvitePreview(token);
  const session = useSession();
  const accept = useAcceptInvite(token);
  const [parsed, setParsed] = useState<StatementParse | null>(null);
  const form = useForm<z.infer<typeof guestSchema>>({
    resolver: zodResolver(guestSchema),
    defaultValues: { name: '', dietaryNote: '' },
  });
  const user = session.data?.user ?? null;

  const go = (result: Awaited<ReturnType<typeof api.parties.acceptInvite>>) => {
    const dup = result.possibleDuplicateOf;
    router.replace(
      dup
        ? `/party/${result.partyId}?possibleDuplicate=${encodeURIComponent(dup.userId)}&name=${encodeURIComponent(dup.name)}`
        : `/party/${result.partyId}`,
    );
  };

  return (
    <QueryState
      query={preview}
      loading={<Skeleton className="h-64 w-full" />}
      errorTitle="This invite link isn’t valid"
    >
      {(inv) => (
        <Card className="mx-auto max-w-lg p-6">
          <p className="text-sm text-muted-foreground">{inv.hostName} invited you to</p>
          <h1 className="mt-1 text-2xl font-semibold">{inv.partyName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(inv.partyDate)} · {inv.memberCount} going
          </p>

          {inv.status !== 'valid' && !inv.alreadyMember ? (
            <div className="mt-6">
              <ErrorState
                title={
                  inv.status === 'revoked' ? 'This link was turned off' : 'This link has been used'
                }
                message="Ask the host for a new invite link."
              />
            </div>
          ) : inv.alreadyMember ? (
            <Button className="mt-6 w-full" asChild>
              <Link href="/party">You’re already in. Open your parties</Link>
            </Button>
          ) : user ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm">
                Join as <strong>{user.name}</strong>. Your allergies and diet on file will be shared
                with the host.
              </p>
              {accept.error && (
                <p role="alert" className="text-sm">
                  {acceptError(accept.error)}
                </p>
              )}
              <Button
                className="w-full"
                loading={accept.isPending}
                onClick={() => accept.mutate({}, { onSuccess: go })}
              >
                Join the party
              </Button>
            </div>
          ) : (
            <form
              noValidate
              className="mt-6 space-y-4"
              onSubmit={form.handleSubmit((values) =>
                accept.mutate(values, {
                  onSuccess: (r) => {
                    toast(`You’re in, ${values.name}!`);
                    go(r);
                  },
                }),
              )}
            >
              <Field label="Your name" error={form.formState.errors.name?.message}>
                <Input autoComplete="given-name" {...form.register('name')} />
              </Field>
              <Field
                label="Any allergies or dietary needs?"
                hint="In your own words, e.g. “I’m allergic to shellfish” or “vegetarian”. Leave blank if none."
              >
                <Textarea
                  rows={2}
                  {...form.register('dietaryNote', {
                    onBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => {
                      const text = e.target.value.trim();
                      if (text.length < 3) return setParsed(null);
                      api.profile.parseStatement(text).then(setParsed, () => setParsed(null));
                    },
                  })}
                />
              </Field>
              {parsed && renderParsePreview(parsed)}
              {accept.error && (
                <p role="alert" className="rounded-md bg-muted px-3 py-2 text-sm">
                  {acceptError(accept.error)}
                </p>
              )}
              <Button type="submit" className="w-full" loading={accept.isPending}>
                Join as a guest
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                No password needed. Have an account?{' '}
                <Link
                  href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                  className="font-medium underline"
                >
                  Log in
                </Link>
              </p>
            </form>
          )}
        </Card>
      )}
    </QueryState>
  );
}
