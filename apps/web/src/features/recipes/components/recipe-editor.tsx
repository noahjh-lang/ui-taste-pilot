'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { generateInputSchema, recipeDraftSchema, type RecipeDraft } from '@tastepilot/api-client';
import { CUISINE_OPTIONS } from '@/lib/options';
import {
  Button,
  Card,
  CardHeader,
  Checkbox,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Tabs,
  TabPanel,
  Textarea,
  toast,
} from '@tastepilot/ui';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { errorMessage } from '@/lib/query-client';
import { useGenerateDraft, useRecipe, useSaveRecipe } from '../api/queries';

// The form keeps list items as objects (react-hook-form field arrays) and converts on save.
const formSchema = recipeDraftSchema.extend({
  ingredients: z
    .array(z.object({ value: z.string().trim().min(1, 'Required') }))
    .min(1, 'Add at least one ingredient'),
  steps: z
    .array(z.object({ value: z.string().trim().min(1, 'Required') }))
    .min(1, 'Add at least one step'),
  tags: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

const EMPTY: FormValues = {
  title: '',
  description: '',
  cuisine: 'american',
  timeMinutes: 30,
  servings: 4,
  tags: '',
  ingredients: [{ value: '' }],
  steps: [{ value: '' }],
};

const toForm = (d: RecipeDraft): FormValues => ({
  ...d,
  tags: d.tags.join(', '),
  ingredients: d.ingredients.map((value) => ({ value })),
  steps: d.steps.map((value) => ({ value })),
});

const fromForm = (v: FormValues): RecipeDraft => ({
  ...v,
  tags: v.tags
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean),
  ingredients: v.ingredients.map((i) => i.value),
  steps: v.steps.map((s) => s.value),
});

function RecipeForm({
  initial,
  editingId,
  source,
}: {
  initial: FormValues;
  editingId?: string;
  source: 'community' | 'ai_generated';
}) {
  const router = useRouter();
  const save = useSaveRecipe(editingId);
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: initial });
  const ingredients = useFieldArray({ control: form.control, name: 'ingredients' });
  const steps = useFieldArray({ control: form.control, name: 'steps' });
  useEffect(() => form.reset(initial), [initial, form]);
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) =>
    save.mutate(
      { draft: fromForm(values), source },
      {
        onSuccess: (detail) => {
          toast(
            editingId ? 'Recipe updated' : 'Recipe saved',
            'Checked against your allergies and diet.',
          );
          router.push(`/recipes/${detail.recipe.id}`);
        },
        onError: (e) => toast('Couldn’t save the recipe', errorMessage(e)),
      },
    ),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field label="Title" error={errors.title?.message}>
        <Input {...form.register('title')} />
      </Field>
      <Field label="Description" error={errors.description?.message}>
        <Textarea rows={2} {...form.register('description')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Cuisine" error={errors.cuisine?.message}>
          <Select {...form.register('cuisine')}>
            {CUISINE_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Time (minutes)" error={errors.timeMinutes?.message}>
          <Input type="number" min={1} {...form.register('timeMinutes', { valueAsNumber: true })} />
        </Field>
        <Field label="Servings" error={errors.servings?.message}>
          <Input type="number" min={1} {...form.register('servings', { valueAsNumber: true })} />
        </Field>
      </div>
      <Field label="Tags" hint="Comma separated, e.g. dinner, quick, vegetarian">
        <Input {...form.register('tags')} />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Ingredients</legend>
        <p className="text-xs text-muted-foreground">
          One per line, as you’d write it (“2 cups basmati rice”). We match each against verified
          allergen data when you save.
        </p>
        {ingredients.fields.map((field, i) => (
          <div key={field.id} className="flex gap-2">
            <label htmlFor={`ing-${i}`} className="sr-only">
              Ingredient {i + 1}
            </label>
            <Input
              id={`ing-${i}`}
              {...form.register(`ingredients.${i}.value`)}
              aria-invalid={!!errors.ingredients?.[i]}
            />
            <Button
              variant="ghost"
              aria-label={`Remove ingredient ${i + 1}`}
              onClick={() => ingredients.remove(i)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        {errors.ingredients?.message && (
          <p className="text-xs font-medium">⚠ {errors.ingredients.message}</p>
        )}
        <Button variant="secondary" size="sm" onClick={() => ingredients.append({ value: '' })}>
          <Plus className="size-4" aria-hidden /> Add ingredient
        </Button>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Method</legend>
        {steps.fields.map((field, i) => (
          <div key={field.id} className="flex gap-2">
            <label htmlFor={`step-${i}`} className="sr-only">
              Step {i + 1}
            </label>
            <Textarea
              id={`step-${i}`}
              rows={2}
              className="min-h-11"
              {...form.register(`steps.${i}.value`)}
            />
            <Button
              variant="ghost"
              aria-label={`Remove step ${i + 1}`}
              onClick={() => steps.remove(i)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        {errors.steps?.message && <p className="text-xs font-medium">⚠ {errors.steps.message}</p>}
        <Button variant="secondary" size="sm" onClick={() => steps.append({ value: '' })}>
          <Plus className="size-4" aria-hidden /> Add step
        </Button>
      </fieldset>

      <Button type="submit" loading={save.isPending}>
        {editingId ? 'Save changes' : 'Save recipe'}
      </Button>
    </form>
  );
}

function AiDraft({ onDraft }: { onDraft: (draft: RecipeDraft, notes: string[]) => void }) {
  const generate = useGenerateDraft();
  const form = useForm<z.infer<typeof generateInputSchema>>({
    resolver: zodResolver(generateInputSchema),
    defaultValues: { prompt: '', usePantry: true },
  });
  const onSubmit = form.handleSubmit((values) =>
    generate.mutate(values, {
      onSuccess: (result) => onDraft(result.draft, result.notes),
      onError: (e) => toast('Couldn’t draft a recipe', errorMessage(e)),
    }),
  );
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field
        label="What would you like to cook?"
        hint="e.g. “a spicy thai curry for four”, “quick pasta with what’s in my pantry”"
        error={form.formState.errors.prompt?.message}
      >
        <Textarea rows={3} {...form.register('prompt')} />
      </Field>
      <Checkbox label="Use ingredients from my pantry" {...form.register('usePantry')} />
      <Button type="submit" loading={generate.isPending}>
        <Sparkles className="size-4" aria-hidden /> Draft a recipe
      </Button>
    </form>
  );
}

export function CreateRecipeView({ editId }: { editId: string | null }) {
  const [tab, setTab] = useState('ai');
  const [draft, setDraft] = useState<{ values: FormValues; notes: string[] } | null>(null);
  const existing = useRecipe(editId ?? '');

  if (editId) {
    if (existing.isPending) return <Skeleton className="h-96 w-full" />;
    if (existing.isError || !existing.data.canEdit) {
      return <p role="alert">You can only edit recipes you wrote.</p>;
    }
    const r = existing.data.recipe;
    return (
      <>
        <PageHeader title={`Edit ${r.title}`} />
        <Card className="p-5">
          <RecipeForm
            editingId={r.id}
            source={r.source === 'ai_generated' ? 'ai_generated' : 'community'}
            initial={toForm({
              title: r.title,
              description: r.description,
              cuisine: r.cuisine,
              timeMinutes: r.timeMinutes,
              servings: r.servings,
              tags: r.tags,
              ingredients: r.ingredients.map((i) => i.text),
              steps: r.steps,
            })}
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Create a recipe"
        description="Draft one with the assistant or write your own. Every recipe goes through the same safety checks before it’s recommended."
      />
      <Tabs
        value={tab}
        onValueChange={setTab}
        label="How to create"
        tabs={[
          { value: 'ai', label: 'Draft with AI' },
          { value: 'manual', label: 'Write from scratch' },
        ]}
      >
        <TabPanel value="ai" className="space-y-6">
          <Card className="p-5">
            <AiDraft onDraft={(d, notes) => setDraft({ values: toForm(d), notes })} />
          </Card>
          {draft && (
            <Card>
              <CardHeader
                title="Review the draft"
                description="Edit anything. Nothing is saved until you click Save."
              />
              <div className="space-y-4 p-5">
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {draft.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <RecipeForm initial={draft.values} source="ai_generated" />
              </div>
            </Card>
          )}
        </TabPanel>
        <TabPanel value="manual">
          <Card className="p-5">
            <RecipeForm initial={EMPTY} source="community" />
          </Card>
        </TabPanel>
      </Tabs>
    </>
  );
}
