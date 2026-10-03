'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { InviteLink } from '@tastepilot/api-client';
import { formatRelativeDate } from '@tastepilot/shared';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Field,
  Input,
  Select,
  Skeleton,
  toast,
} from '@tastepilot/ui';
import { Copy, Link2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { QueryState } from '@/components/query-state';
import { errorMessage } from '@/lib/query-client';
import { useCreateInvite, useInvites, useRevokeInvite } from '../api/queries';

const formSchema = z.object({
  label: z.string().trim().min(1, 'Label the link').max(40),
  uses: z.enum(['single', 'unlimited']),
});

function inviteUrl(token: string) {
  return `${window.location.origin}/invite/${token}`;
}

function status(link: InviteLink) {
  if (link.revokedAt) return { label: 'Revoked', tone: 'outline' as const };
  if (link.maxUses != null && link.uses >= link.maxUses)
    return { label: 'Used up', tone: 'outline' as const };
  return { label: 'Active', tone: 'brand' as const };
}

/** Several links can be live at once; revoking one never affects the others. */
export function InviteLinksCard({ partyId }: { partyId: string }) {
  const invites = useInvites(partyId, true);
  const create = useCreateInvite(partyId);
  const revoke = useRevokeInvite(partyId);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { label: '', uses: 'unlimited' },
  });

  return (
    <Card>
      <CardHeader
        title="Invite links"
        description="Make a link per group or person. Revoke any one without breaking the rest."
      />
      <div className="space-y-4 p-4 sm:p-5">
        <QueryState query={invites} loading={<Skeleton className="h-20 w-full" />}>
          {(links) => (
            <ul className="divide-y divide-border">
              {links.map((link) => {
                const s = status(link);
                const active = s.label === 'Active';
                return (
                  <li key={link.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium">
                        <Link2 className="size-4 text-muted-foreground" aria-hidden />
                        {link.label}
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {link.maxUses ? `${link.uses}/${link.maxUses} used` : `${link.uses} joined`}{' '}
                        · created {formatRelativeDate(link.createdAt)}
                      </p>
                    </div>
                    {active && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            navigator.clipboard
                              .writeText(inviteUrl(link.token))
                              .then(() => toast('Link copied', inviteUrl(link.token)))
                              .catch(() => toast('Copy this link', inviteUrl(link.token)))
                          }
                        >
                          <Copy className="size-4" aria-hidden /> Copy
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button size="sm" variant="ghost">
                              Revoke
                            </Button>
                          }
                          title={`Revoke “${link.label}”?`}
                          description="Nobody new can join with this link. People who already joined stay, and your other links keep working."
                          confirmLabel="Revoke link"
                          pending={revoke.isPending}
                          onConfirm={() =>
                            revoke
                              .mutateAsync(link.id)
                              .then(() => toast(`“${link.label}” revoked`))
                              .catch((e: unknown) => toast('Couldn’t revoke', errorMessage(e)))
                          }
                        />
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </QueryState>
        <form
          noValidate
          className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
          onSubmit={form.handleSubmit((v) =>
            create.mutate(
              { label: v.label, maxUses: v.uses === 'single' ? 1 : null },
              {
                onSuccess: (link) => {
                  form.reset();
                  void navigator.clipboard?.writeText(inviteUrl(link.token)).catch(() => undefined);
                  toast('Invite link created and copied', inviteUrl(link.token));
                },
                onError: (e) => toast('Couldn’t create the link', errorMessage(e)),
              },
            ),
          )}
        >
          <Field label="New link label" error={form.formState.errors.label?.message}>
            <Input placeholder="e.g. Book club" {...form.register('label')} />
          </Field>
          <Field label="Uses">
            <Select {...form.register('uses')}>
              <option value="unlimited">Anyone with link</option>
              <option value="single">Single use</option>
            </Select>
          </Field>
          <Button type="submit" variant="secondary" loading={create.isPending}>
            Create link
          </Button>
        </form>
      </div>
    </Card>
  );
}
