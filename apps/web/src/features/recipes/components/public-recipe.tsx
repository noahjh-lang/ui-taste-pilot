'use client';

import { formatMinutes } from '@tastepilot/shared';
import { Button, Card, CardHeader, SafetyBadge, Skeleton } from '@tastepilot/ui';
import Link from 'next/link';
import { QueryState } from '@/components/query-state';
import { usePublicRecipe } from '../api/queries';
import { IngredientList } from './recipe-detail';

/** Shareable recipe page. No user, so no personal safety result: it says so. */
export function PublicRecipeView({ id }: { id: string }) {
  const query = usePublicRecipe(id);
  return (
    <QueryState
      query={query}
      loading={<Skeleton className="h-96 w-full" />}
      errorTitle="Recipe not found"
    >
      {(r) => (
        <article className="space-y-6">
          <div
            className="flex h-32 items-center justify-center rounded-2xl bg-muted text-6xl"
            aria-hidden
          >
            {r.emoji}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{r.title}</h1>
            <p className="mt-2 text-muted-foreground">{r.description}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="capitalize">{r.cuisine}</span> · {formatMinutes(r.timeMinutes)} ·
              serves {r.servings}
              {r.author?.handle && (
                <>
                  {' · by '}
                  <Link href={`/c/${r.author.handle}`} className="underline">
                    {r.author.name}
                  </Link>
                </>
              )}
            </p>
          </div>
          <Card className="flex flex-wrap items-center gap-3 p-4">
            <SafetyBadge status={null} />
            <p className="flex-1 text-sm text-muted-foreground">
              Log in to check this recipe against your allergies and diet.
            </p>
            <Button asChild size="sm">
              <Link href={`/login?next=${encodeURIComponent(`/recipes/${r.id}`)}`}>
                Check for me
              </Link>
            </Button>
          </Card>
          <Card>
            <CardHeader title="Ingredients" />
            <div className="px-5 pb-4">
              <IngredientList ingredients={r.ingredients} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Method" />
            <ol className="list-decimal space-y-3 px-5 py-4 pl-10 text-sm">
              {r.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </Card>
        </article>
      )}
    </QueryState>
  );
}
