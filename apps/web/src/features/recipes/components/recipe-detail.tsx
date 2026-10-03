'use client';

import type { Ingredient, RecipeDetail } from '@tastepilot/api-client';
import { formatMinutes } from '@tastepilot/shared';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ScoreBreakdown,
  Skeleton,
  StarRating,
  toast,
} from '@tastepilot/ui';
import { Clock, Pencil, ThumbsDown, ThumbsUp, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { QueryState } from '@/components/query-state';
import { errorMessage } from '@/lib/query-client';
import { useFeedback, usePublish, useRecipe } from '../api/queries';

export function IngredientList({ ingredients }: { ingredients: Ingredient[] }) {
  const unverified = ingredients.filter((i) => !i.canonical).length;
  return (
    <div>
      <ul className="divide-y divide-border">
        {ingredients.map((ing, i) => (
          <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
            <span>{ing.text}</span>
            <span className="flex flex-wrap gap-1">
              {!ing.canonical && (
                <Badge
                  tone="outline"
                  className="border-safety-unverified-fg/40 text-safety-unverified-fg"
                >
                  not in verified data
                </Badge>
              )}
              {ing.allergens.map((a) => (
                <Badge key={a} tone="neutral">
                  contains {a.replace('_', ' ')}
                </Badge>
              ))}
            </span>
          </li>
        ))}
      </ul>
      {unverified > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {unverified} {unverified === 1 ? 'ingredient isn’t' : 'ingredients aren’t'} in our
          verified allergen data, so safety can’t be confirmed for{' '}
          {unverified === 1 ? 'it' : 'them'}.
        </p>
      )}
    </div>
  );
}

function FeedbackButtons({ detail }: { detail: RecipeDetail }) {
  const feedback = useFeedback(detail.recipe.id);
  const current = detail.myFeedback;
  const set = (value: 'like' | 'dislike') =>
    feedback.mutate(current === value ? null : value, {
      onError: (e) => toast('Couldn’t save that', errorMessage(e)),
    });
  return (
    <div className="flex gap-2" role="group" aria-label="Your feedback">
      <Button
        variant={current === 'like' ? 'primary' : 'secondary'}
        size="sm"
        aria-pressed={current === 'like'}
        onClick={() => set('like')}
      >
        <ThumbsUp className="size-4" aria-hidden /> More like this
      </Button>
      <Button
        variant={current === 'dislike' ? 'primary' : 'secondary'}
        size="sm"
        aria-pressed={current === 'dislike'}
        onClick={() => set('dislike')}
      >
        <ThumbsDown className="size-4" aria-hidden /> Less like this
      </Button>
    </div>
  );
}

function PublishControl({ detail }: { detail: RecipeDetail }) {
  const publish = usePublish(detail.recipe.id);
  const published = detail.recipe.published;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={published ? 'brand' : 'outline'}>
        {published ? 'Published to cookbook' : 'Private draft'}
      </Badge>
      <Button
        size="sm"
        variant="secondary"
        loading={publish.isPending}
        onClick={() =>
          publish.mutate(!published, {
            onSuccess: () =>
              toast(published ? 'Recipe unpublished' : 'Published to the community cookbook'),
            onError: (e) => toast('Couldn’t update', errorMessage(e)),
          })
        }
      >
        {published ? 'Unpublish' : 'Publish to cookbook'}
      </Button>
      <Button size="sm" variant="ghost" asChild>
        <Link href={`/create?edit=${detail.recipe.id}`}>
          <Pencil className="size-4" aria-hidden /> Edit
        </Link>
      </Button>
    </div>
  );
}

/**
 * Recipe detail. Other features' panels (safety, logging, calendar, potluck,
 * community) are composed in by the page through the slots.
 */
export function RecipeDetailView({
  id,
  safety,
  actions,
  community,
}: {
  id: string;
  safety: ReactNode;
  actions: (detail: RecipeDetail) => ReactNode;
  community: ReactNode;
}) {
  const query = useRecipe(id);
  return (
    <QueryState
      query={query}
      errorTitle="Couldn’t load this recipe"
      loading={
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      {(detail) => {
        const r = detail.recipe;
        return (
          <article className="space-y-6">
            <header className="overflow-hidden rounded-2xl border border-border">
              <div className="flex h-32 items-center justify-center bg-muted text-6xl" aria-hidden>
                {r.emoji}
              </div>
              <div className="space-y-3 bg-surface p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge tone="outline" className="capitalize">
                    {r.cuisine}
                  </Badge>
                  {r.source === 'ai_generated' && <Badge tone="outline">AI-assisted draft</Badge>}
                  {r.tags.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{r.title}</h1>
                <p className="text-muted-foreground">{r.description}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-4" aria-hidden /> {formatMinutes(r.timeMinutes)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-4" aria-hidden /> Serves {r.servings}
                  </span>
                  {r.rating.count > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <StarRating value={Math.round(r.rating.average)} />{' '}
                      {r.rating.average.toFixed(1)} ({r.rating.count})
                    </span>
                  )}
                  {r.author?.handle && (
                    <span>
                      by{' '}
                      <Link
                        href={`/c/${r.author.handle}`}
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {r.author.name}
                      </Link>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <FeedbackButtons detail={detail} />
                  {actions(detail)}
                </div>
                {detail.canEdit && <PublishControl detail={detail} />}
              </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
              <div className="space-y-6">
                <Card className="p-5">{safety}</Card>
                <Card>
                  <CardHeader title="Ingredients" />
                  <div className="px-5 pb-4">
                    <IngredientList ingredients={r.ingredients} />
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Method" />
                  <ol className="list-decimal space-y-3 px-5 py-4 pl-10 text-sm">
                    {r.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </Card>
                {community}
              </div>
              <aside>
                <Card className="p-5 lg:sticky lg:top-6">
                  <h2 className="mb-2 font-semibold">Why this recipe?</h2>
                  <ScoreBreakdown total={detail.score.total} components={detail.score.components} />
                  {detail.pantryMatch.total > 0 && (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Pantry: you have {detail.pantryMatch.have} of {detail.pantryMatch.total} key
                      ingredients.
                    </p>
                  )}
                </Card>
              </aside>
            </div>
          </article>
        );
      }}
    </QueryState>
  );
}
