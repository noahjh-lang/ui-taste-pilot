'use client';

import { formatMinutes, scoreToPercent, type SafetyStatus } from '@tastepilot/shared';
import { Clock, Star } from 'lucide-react';
import type { ElementType, ReactNode } from 'react';
import { cn } from '../cn';
import { SafetyBadge } from './safety-badge';

export interface RecipeCardData {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  timeMinutes: number;
  emoji: string;
  color: string;
  rating: { average: number; count: number };
  author?: { name: string } | null;
}

/** Recipe tile used on every recommendation surface. */
export function RecipeCard({
  recipe,
  href,
  safety,
  score,
  LinkComponent = 'a',
  meta,
  onNavigate,
}: {
  recipe: RecipeCardData;
  href: string;
  /** Server-returned safety; omit only on surfaces without a user (public pages). */
  safety?: { status: SafetyStatus | null | undefined; pending?: boolean; error?: boolean };
  /** Ranking total (-1..1), shown as a match percentage. */
  score?: number;
  LinkComponent?: ElementType;
  meta?: ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-shadow focus-within:ring-2 focus-within:ring-brand hover:shadow-md">
      <div
        // Neutral on purpose: red/amber/green are reserved for safety states.
        className="flex h-24 items-center justify-center bg-muted text-4xl"
        aria-hidden
      >
        {recipe.emoji}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {safety && (
            <SafetyBadge
              size="sm"
              status={safety.status}
              pending={safety.pending}
              error={safety.error}
            />
          )}
          {score !== undefined && (
            <span className="text-xs font-medium text-brand">{scoreToPercent(score)}% match</span>
          )}
        </div>
        <h3 className="leading-snug font-semibold">
          <LinkComponent
            href={href}
            onClick={onNavigate}
            className="after:absolute after:inset-0 focus:outline-none"
          >
            {recipe.title}
          </LinkComponent>
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
          <span className="capitalize">{recipe.cuisine}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {formatMinutes(recipe.timeMinutes)}
          </span>
          {recipe.rating.count > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="size-3.5" aria-hidden />
              {recipe.rating.average.toFixed(1)}
              <span className="sr-only">stars from {recipe.rating.count} ratings</span>
            </span>
          )}
          {recipe.author && <span>by {recipe.author.name}</span>}
          {meta}
        </div>
      </div>
    </article>
  );
}

export function RecipeGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {children}
    </div>
  );
}

export interface ScoreComponentData {
  key: string;
  label: string;
  weight: number;
  value: number;
  contribution: number;
  explanation: string;
}

/** Explains a ranking score: every weighted component and why it moved. */
export function ScoreBreakdown({
  total,
  components,
}: {
  total: number;
  components: ScoreComponentData[];
}) {
  return (
    <div>
      <p className="text-sm">
        <span className="text-2xl font-semibold text-brand">{scoreToPercent(total)}%</span>{' '}
        <span className="text-muted-foreground">match for you</span>
      </p>
      <ul className="mt-3 space-y-3">
        {components.map((c) => {
          const width = Math.min(100, Math.abs(c.contribution) * 200);
          return (
            <li key={c.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{c.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {c.contribution >= 0 ? '+' : '−'}
                  {Math.abs(c.contribution).toFixed(2)} <span className="sr-only">points</span>
                  <span aria-hidden> · weight {c.weight}</span>
                </span>
              </div>
              <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div
                  className={cn(
                    'h-full rounded-full',
                    c.contribution >= 0 ? 'bg-brand' : 'bg-foreground/50',
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.explanation}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One learned preference: value, confidence and whether it was stated. */
export function PreferenceChip({
  label,
  value,
  confidence,
  explicit,
}: {
  label: string;
  value: number;
  confidence: number;
  explicit: boolean;
}) {
  const sentiment = value > 0.2 ? 'likes' : value < -0.2 ? 'dislikes' : 'neutral';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        sentiment === 'likes' && 'border-brand/40 bg-brand/10 text-foreground',
        sentiment === 'dislikes' && 'border-foreground/30 bg-muted text-foreground',
        sentiment === 'neutral' && 'border-border text-muted-foreground',
      )}
    >
      <span aria-hidden>{sentiment === 'likes' ? '♥' : sentiment === 'dislikes' ? '✕' : '·'}</span>
      {label}
      <span className="sr-only">
        {sentiment}, {Math.round(confidence * 100)}% confidence,{' '}
        {explicit ? 'you told us' : 'learned from what you eat'}
      </span>
      {explicit && (
        <span aria-hidden className="text-muted-foreground">
          (said)
        </span>
      )}
    </span>
  );
}

export function StarRating({
  value,
  onChange,
  label = 'Rating',
}: {
  value: number | null;
  onChange?: (value: number) => void;
  label?: string;
}) {
  if (!onChange) {
    return (
      <span
        role="img"
        className="inline-flex text-brand"
        aria-label={`${value ?? 0} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn('size-4', n <= (value ?? 0) ? 'fill-current' : 'opacity-30')}
            aria-hidden
          />
        ))}
      </span>
    );
  }
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input
              type="radio"
              name="star-rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="peer sr-only"
            />
            <span className="inline-flex size-11 items-center justify-center rounded-md text-brand peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
              <Star
                className={cn('size-6', n <= (value ?? 0) ? 'fill-current' : 'opacity-40')}
                aria-hidden
              />
              <span className="sr-only">{n} stars</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
