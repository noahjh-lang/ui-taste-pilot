'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { toIsoDate, formatRelativeDate } from '@tastepilot/shared';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Dialog,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
  toast,
} from '@tastepilot/ui';
import { BookPlus, Home, Store, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { QueryState } from '@/components/query-state';
import { errorMessage } from '@/lib/query-client';
import { useDeleteLog, useFoodLogs, useLogMeal } from './queries';

const formSchema = z.object({
  kind: z.enum(['home', 'restaurant']),
  dishName: z.string().trim().min(2, 'What did you eat?').max(80),
  restaurantName: z.string().trim().max(80),
  ingredients: z.string(),
  rating: z.enum(['liked', 'neutral', 'disliked']),
  notes: z.string().trim().max(500),
  eatenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
});
type FormValues = z.infer<typeof formSchema>;

/**
 * Log a meal. Used on the food history page and, pre-filled, from a recipe
 * ("I cooked this").
 */
export function LogMealDialog({
  recipe,
  trigger,
}: {
  recipe?: { id: string; title: string };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const log = useLogMeal();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kind: 'home',
      dishName: recipe?.title ?? '',
      restaurantName: '',
      ingredients: '',
      rating: 'liked',
      notes: '',
      eatenOn: toIsoDate(new Date()),
    },
  });
  const kind = useWatch({ control: form.control, name: 'kind' });

  const onSubmit = form.handleSubmit((v) => {
    const ingredients = v.ingredients
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!recipe && v.kind === 'home' && ingredients.length === 0) {
      form.setError('ingredients', {
        message: 'Add the main ingredients so we can learn from it.',
      });
      return;
    }
    log.mutate(
      {
        kind: v.kind,
        dishName: v.dishName,
        recipeId: recipe?.id ?? null,
        restaurantName: v.kind === 'restaurant' ? v.restaurantName || null : null,
        ingredients,
        rating: v.rating,
        notes: v.notes,
        eatenOn: v.eatenOn,
      },
      {
        onSuccess: (entry) => {
          setOpen(false);
          form.reset();
          toast(
            'Logged',
            entry.affectedPreferences.length
              ? `Updated your taste for ${entry.affectedPreferences.slice(0, 4).join(', ').toLowerCase()}.`
              : undefined,
          );
        },
        onError: (e) => toast('Couldn’t log that', errorMessage(e)),
      },
    );
  });

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={recipe ? `Log ${recipe.title}` : 'Log a meal'}
      description="Every meal you log teaches your taste profile. Remove it any time and we’ll recompute."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {!recipe && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Where?</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['home', 'restaurant'] as const).map((k) => (
                <label
                  key={k}
                  className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand"
                >
                  <input type="radio" value={k} className="sr-only" {...form.register('kind')} />
                  {k === 'home' ? (
                    <Home className="size-4" aria-hidden />
                  ) : (
                    <Store className="size-4" aria-hidden />
                  )}
                  {k === 'home' ? 'Cooked at home' : 'Ate out'}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {!recipe && (
          <Field label="Dish" error={form.formState.errors.dishName?.message}>
            <Input {...form.register('dishName')} />
          </Field>
        )}
        {kind === 'restaurant' && (
          <Field label="Restaurant (optional)">
            <Input {...form.register('restaurantName')} />
          </Field>
        )}
        {!recipe && (
          <Field
            label="Main ingredients"
            hint="Comma separated. We only learn from ingredients in our verified data."
            error={form.formState.errors.ingredients?.message}
          >
            <Textarea rows={2} {...form.register('ingredients')} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="How was it?">
            <Select {...form.register('rating')}>
              <option value="liked">Loved it</option>
              <option value="neutral">It was fine</option>
              <option value="disliked">Didn’t like it</option>
            </Select>
          </Field>
          <Field label="When" error={form.formState.errors.eatenOn?.message}>
            <Input type="date" {...form.register('eatenOn')} />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <Textarea rows={2} {...form.register('notes')} />
        </Field>
        <Button type="submit" className="w-full" loading={log.isPending}>
          Save to food history
        </Button>
      </form>
    </Dialog>
  );
}

export function FoodHistoryView() {
  const logs = useFoodLogs();
  const remove = useDeleteLog();
  return (
    <>
      <PageHeader
        title="Food history"
        description="What you cook and eat out shapes your recommendations."
        action={
          <LogMealDialog
            trigger={
              <Button>
                <BookPlus className="size-4" aria-hidden /> Log a meal
              </Button>
            }
          />
        }
      />
      <QueryState
        query={logs}
        loading={<Skeleton className="h-48 w-full" />}
        errorTitle="Couldn’t load your food history"
      >
        {(list) =>
          list.length === 0 ? (
            <EmptyState
              icon="📓"
              title="Nothing logged yet"
              description="Log a meal to start teaching TastePilot your taste."
            />
          ) : (
            <Card>
              <ul className="divide-y divide-border">
                {list.map((log) => (
                  <li key={log.id} className="flex flex-wrap items-start gap-3 p-4">
                    <span className="mt-0.5 text-muted-foreground" aria-hidden>
                      {log.kind === 'home' ? (
                        <Home className="size-5" />
                      ) : (
                        <Store className="size-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {log.recipeId ? (
                          <Link
                            href={`/recipes/${log.recipeId}`}
                            className="underline-offset-2 hover:underline"
                          >
                            {log.dishName}
                          </Link>
                        ) : (
                          log.dishName
                        )}
                        {log.restaurantName && (
                          <span className="font-normal text-muted-foreground">
                            {' '}
                            at {log.restaurantName}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeDate(log.eatenOn)} ·{' '}
                        {log.rating === 'liked'
                          ? 'Loved it'
                          : log.rating === 'neutral'
                            ? 'It was fine'
                            : 'Didn’t like it'}
                      </p>
                      {log.notes && <p className="mt-1 text-sm">{log.notes}</p>}
                      {log.affectedPreferences.length > 0 && (
                        <p className="mt-2 flex flex-wrap gap-1">
                          <span className="text-xs text-muted-foreground">Taught us about:</span>
                          {log.affectedPreferences.map((p) => (
                            <Badge key={p} tone="outline">
                              {p}
                            </Badge>
                          ))}
                        </p>
                      )}
                    </div>
                    <ConfirmDialog
                      trigger={
                        <Button size="sm" variant="ghost" aria-label={`Remove ${log.dishName}`}>
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      }
                      title={`Remove ${log.dishName}?`}
                      description="Its evidence is removed and your preferences are recalculated from what’s left."
                      confirmLabel="Remove"
                      pending={remove.isPending}
                      onConfirm={() =>
                        remove
                          .mutateAsync(log.id)
                          .then(() => toast('Removed', 'Your taste profile was recalculated.'))
                          .catch((e: unknown) => toast('Couldn’t remove it', errorMessage(e)))
                      }
                    />
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
