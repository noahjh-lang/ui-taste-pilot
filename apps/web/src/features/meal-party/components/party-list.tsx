'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createPartyInputSchema, type CreatePartyInput, type Me } from '@tastepilot/api-client';
import { addDays, formatDate, toIsoDate } from '@tastepilot/shared';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Skeleton,
  Textarea,
  toast,
} from '@tastepilot/ui';
import { CalendarDays, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { QueryState } from '@/components/query-state';
import { errorMessage } from '@/lib/query-client';
import { useCreateParty, useParties } from '../api/queries';

function CreatePartyDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const create = useCreateParty();
  const form = useForm<CreatePartyInput>({
    resolver: zodResolver(createPartyInputSchema),
    defaultValues: { name: '', date: addDays(toIsoDate(new Date()), 7), description: '' },
  });
  const onSubmit = form.handleSubmit((values) =>
    create.mutate(values, {
      onSuccess: (party) => {
        setOpen(false);
        router.push(`/party/${party.id}`);
      },
      onError: (e) => toast('Couldn’t create the party', errorMessage(e)),
    }),
  );
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <Plus className="size-4" aria-hidden /> New Meal Party
        </Button>
      }
      title="Plan a Meal Party"
      description="You’ll get invite links to share. Everyone’s allergies and diets are merged so you always know what’s safe."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Name" error={form.formState.errors.name?.message}>
          <Input placeholder="Friday potluck" {...form.register('name')} />
        </Field>
        <Field label="Date" error={form.formState.errors.date?.message}>
          <Input type="date" {...form.register('date')} />
        </Field>
        <Field label="Details (optional)" error={form.formState.errors.description?.message}>
          <Textarea rows={2} {...form.register('description')} />
        </Field>
        <Button type="submit" className="w-full" loading={create.isPending}>
          Create party
        </Button>
      </form>
    </Dialog>
  );
}

export function PartyListView({ user }: { user: Me }) {
  const parties = useParties();
  return (
    <>
      <PageHeader
        title="Meal Parties"
        description="Plan group meals and potlucks where everyone can eat safely."
        action={user.kind === 'full' ? <CreatePartyDialog /> : undefined}
      />
      <QueryState
        query={parties}
        loading={<Skeleton className="h-32 w-full" />}
        errorTitle="Couldn’t load your parties"
      >
        {(list) =>
          list.length === 0 ? (
            <EmptyState
              icon="🎉"
              title="No parties yet"
              description="Create one and share an invite link with your guests."
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {list.map((p) => (
                <li key={p.id}>
                  <Card className="relative p-4 focus-within:ring-2 focus-within:ring-brand hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold">
                        <Link
                          href={`/party/${p.id}`}
                          className="after:absolute after:inset-0 focus:outline-none"
                        >
                          {p.name}
                        </Link>
                      </h2>
                      <Badge tone={p.myRole === 'host' ? 'brand' : 'outline'}>
                        {p.myRole === 'host' ? 'Hosting' : 'Guest'}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {p.description}
                    </p>
                    <p className="mt-3 flex gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden /> {formatDate(p.date)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" aria-hidden /> {p.memberCount}
                      </span>
                      <span>Host: {p.hostName}</span>
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          )
        }
      </QueryState>
    </>
  );
}
