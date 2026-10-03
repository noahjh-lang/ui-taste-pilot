'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { pantryInputSchema, type PantryInput } from '@tastepilot/api-client';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Skeleton,
  toast,
} from '@tastepilot/ui';
import { Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { QueryState } from '@/components/query-state';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';

function usePantry() {
  return useQuery({ queryKey: queryKeys.pantry, queryFn: ({ signal }) => api.pantry.list(signal) });
}

/** Pantry changes affect "cook from your pantry" ranking. */
function usePantryMutation<T>(fn: (input: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.pantry }),
        qc.invalidateQueries({ queryKey: queryKeys.recipes }),
        qc.invalidateQueries({ queryKey: ['recipe'] }),
      ]),
  });
}

export function PantryView() {
  const pantry = usePantry();
  const add = usePantryMutation((input: PantryInput) => api.pantry.add(input));
  const remove = usePantryMutation((id: string) => api.pantry.remove(id));
  const form = useForm<PantryInput>({
    resolver: zodResolver(pantryInputSchema),
    defaultValues: { name: '', quantity: '' },
  });

  return (
    <>
      <PageHeader
        title="Pantry"
        description={
          <>
            What you have on hand. Recipes that use it rank higher:{' '}
            <Link href="/home" className="underline">
              see what you can cook
            </Link>
            .
          </>
        }
      />
      <Card className="mb-6 p-4 sm:p-5">
        <form
          noValidate
          className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
          onSubmit={form.handleSubmit((v) =>
            add.mutate(v, {
              onSuccess: () => form.reset(),
              onError: (e) => toast('Couldn’t add it', errorMessage(e)),
            }),
          )}
        >
          <Field label="Ingredient" error={form.formState.errors.name?.message}>
            <Input placeholder="e.g. basmati rice" {...form.register('name')} />
          </Field>
          <Field label="Amount (optional)">
            <Input placeholder="1 kg" {...form.register('quantity')} />
          </Field>
          <Button type="submit" loading={add.isPending}>
            <Plus className="size-4" aria-hidden /> Add
          </Button>
        </form>
      </Card>
      <QueryState
        query={pantry}
        loading={<Skeleton className="h-40 w-full" />}
        errorTitle="Couldn’t load your pantry"
      >
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              icon="🧺"
              title="Your pantry is empty"
              description="Add what you have and we’ll suggest recipes that use it."
            />
          ) : (
            <Card>
              <ul className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 border-border px-4 py-2 sm:border-b"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                        {item.quantity && <span>{item.quantity}</span>}
                        {!item.canonical && <Badge tone="outline">not matched to recipes</Badge>}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${item.name}`}
                      onClick={() =>
                        remove.mutate(item.id, {
                          onError: (e) => toast('Couldn’t remove it', errorMessage(e)),
                        })
                      }
                    >
                      <X className="size-4" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )
        }
      </QueryState>
    </>
  );
}
