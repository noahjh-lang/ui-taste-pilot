'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { PotluckContribution, RankedRecipe } from '@tastepilot/api-client';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  Input,
  SafetyBadge,
  Select,
  Skeleton,
  Textarea,
  toast,
} from '@tastepilot/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { QueryState } from '@/components/query-state';
import { COURSE_OPTIONS } from '@/lib/options';
import { errorMessage } from '@/lib/query-client';
import { useContributions, usePropose, useSetContributionStatus } from '../api/queries';

const formSchema = z.object({
  dishName: z.string().trim().min(2, 'Name the dish').max(80),
  course: z.enum(['main', 'side', 'dessert', 'drink', 'other']),
  recipeId: z.string(),
  ingredients: z.string(),
});

function ProposeDialog({ partyId, recipes }: { partyId: string; recipes: RankedRecipe[] }) {
  const [open, setOpen] = useState(false);
  const propose = usePropose(partyId);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { dishName: '', course: 'main', recipeId: '', ingredients: '' },
  });
  const recipeId = useWatch({ control: form.control, name: 'recipeId' });

  const onSubmit = form.handleSubmit((v) => {
    const ingredients = v.ingredients
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!v.recipeId && ingredients.length === 0) {
      form.setError('ingredients', {
        message: 'List the ingredients so everyone can be checked for allergies.',
      });
      return;
    }
    propose.mutate(
      { dishName: v.dishName, course: v.course, recipeId: v.recipeId || null, ingredients },
      {
        onSuccess: (c) => {
          setOpen(false);
          form.reset();
          const verdict =
            c.safety.status === 'safe'
              ? 'Safe for everyone.'
              : c.safety.status === 'conflict'
                ? `Conflicts with ${[...new Set(c.safety.conflicts.map((x) => x.memberName))].join(', ')}.`
                : 'Some ingredients couldn’t be verified.';
          toast(`${c.dishName} added`, verdict);
        },
        onError: (e) => toast('Couldn’t add the dish', errorMessage(e)),
      },
    );
  });

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="sm">
          <Plus className="size-4" aria-hidden /> Bring a dish
        </Button>
      }
      title="Bring a dish"
      description="We’ll check it against everyone else’s allergies and diets before it shows as compatible."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Dish" error={form.formState.errors.dishName?.message}>
          <Input placeholder="e.g. Lemon bars" {...form.register('dishName')} />
        </Field>
        <Field label="Course">
          <Select {...form.register('course')}>
            {COURSE_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        {recipes.length > 0 && (
          <Field
            label="From a recipe (optional)"
            hint="Picking a recipe uses its exact ingredient list."
          >
            <Select
              {...form.register('recipeId', {
                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                  const r = recipes.find((x) => x.recipe.id === e.target.value);
                  if (r && !form.getValues('dishName')) form.setValue('dishName', r.recipe.title);
                },
              })}
            >
              <option value="">No, I’ll list ingredients</option>
              {recipes.map((r) => (
                <option key={r.recipe.id} value={r.recipe.id}>
                  {r.recipe.title}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {!recipeId && (
          <Field
            label="Ingredients"
            hint="One per line or comma separated. Include sauces, toppings and anything store-bought."
            error={form.formState.errors.ingredients?.message}
          >
            <Textarea rows={4} {...form.register('ingredients')} />
          </Field>
        )}
        <Button type="submit" className="w-full" loading={propose.isPending}>
          Check and add
        </Button>
      </form>
    </Dialog>
  );
}

function ContributionRow({
  c,
  myId,
  isHost,
}: {
  c: PotluckContribution;
  myId: string;
  isHost: boolean;
}) {
  const setStatus = useSetContributionStatus(c.partyId);
  const canEdit = c.memberId === myId || isHost;
  const next = c.status === 'proposed' ? 'claimed' : c.status === 'claimed' ? 'brought' : null;
  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{c.dishName}</p>
          <p className="text-xs text-muted-foreground">
            {c.memberName}
            {c.memberId === myId && ' (you)'} · <span className="capitalize">{c.course}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SafetyBadge
            status={c.safety.status}
            label={c.safety.status === 'safe' ? 'Safe for everyone' : undefined}
          />
          <Badge tone="outline" aria-live="polite">
            {c.status === 'proposed'
              ? 'Proposed'
              : c.status === 'claimed'
                ? 'Claimed'
                : 'Brought ✓'}
            {setStatus.isPending && ' · saving…'}
          </Badge>
          {canEdit && next && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setStatus.mutate(
                  { contributionId: c.id, status: next },
                  { onError: (e) => toast('Couldn’t update', errorMessage(e)) },
                )
              }
            >
              {next === 'claimed' ? 'Claim it' : 'Mark as brought'}
            </Button>
          )}
        </div>
      </div>
      {c.safety.conflicts.length > 0 && (
        <ul className="space-y-0.5 text-sm">
          {c.safety.conflicts.map((x, i) => (
            <li key={i}>
              ⊘ <strong>{x.ingredient}</strong> conflicts with {x.memberName}’s{' '}
              {x.constraintLabel.toLowerCase()}.
            </li>
          ))}
        </ul>
      )}
      {c.safety.unverifiedIngredients.length > 0 && (
        <p className="text-sm">
          ⚠ Couldn’t verify: {c.safety.unverifiedIngredients.join(', ')}. Check the labels before
          serving.
        </p>
      )}
    </li>
  );
}

export function PotluckCard({
  partyId,
  myId,
  isHost,
  recipes,
}: {
  partyId: string;
  myId: string;
  isHost: boolean;
  recipes: RankedRecipe[];
}) {
  const contributions = useContributions(partyId);
  return (
    <Card>
      <CardHeader
        title="Potluck"
        description="Each dish is checked against every other member’s allergies and diets."
        action={<ProposeDialog partyId={partyId} recipes={recipes} />}
      />
      <div className="px-4 sm:px-5">
        <QueryState query={contributions} loading={<Skeleton className="my-4 h-24 w-full" />}>
          {(list) =>
            list.length === 0 ? (
              <div className="py-4">
                <EmptyState title="No dishes yet" description="Be the first to bring something." />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {list.map((c) => (
                  <ContributionRow key={c.id} c={c} myId={myId} isHost={isHost} />
                ))}
              </ul>
            )
          }
        </QueryState>
      </div>
    </Card>
  );
}
