import type { Ingredient, Score, ScoreComponent } from '@tastepilot/api-client';
import { ingredientByKey } from '../data/ingredients';
import type { PrefState, PrefType } from './preferences';
import { prefLabel } from './preferences';

/**
 * The one shared, explainable ranking function. Home, Search, Discover,
 * Meal Party and restaurant dishes all score items with this; no surface has
 * its own scoring logic. Weights are fixed and every component explains
 * itself.
 */
export const WEIGHTS = {
  taste: 0.5,
  popularity: 0.2,
  pantry: 0.15,
  freshness: 0.15,
} as const;

export interface RankableItem {
  id: string;
  ingredients: Ingredient[];
  cuisine: string | null;
  flavors: string[];
  rating: { average: number; count: number } | null;
}

export interface RankingContext {
  prefs: Map<string, PrefState>;
  pantryKeys: Set<string>;
  /** Item ids cooked/eaten recently (last 14 days). */
  recentIds: Set<string>;
}

export const prefId = (prefType: PrefType, key: string) => `${prefType}:${key}`;

function itemKeys(item: RankableItem) {
  const keys: Array<{ prefType: PrefType; key: string }> = [];
  for (const ing of item.ingredients) {
    if (!ing.canonical) continue;
    if (ingredientByKey(ing.canonical)?.staple) continue;
    keys.push({ prefType: 'ingredient', key: ing.canonical });
  }
  if (item.cuisine) keys.push({ prefType: 'cuisine', key: item.cuisine });
  for (const flavor of item.flavors) keys.push({ prefType: 'flavor', key: flavor });
  return keys;
}

const round = (n: number) => Math.round(n * 1000) / 1000;
const clamp = (n: number) => Math.max(-1, Math.min(1, n));

export function pantryCoverage(item: RankableItem, pantryKeys: Set<string>) {
  const needed = new Set(
    item.ingredients
      .filter((i) => i.canonical && !ingredientByKey(i.canonical)?.staple)
      .map((i) => i.canonical as string),
  );
  const have = [...needed].filter((k) => pantryKeys.has(k)).length;
  return { have, total: needed.size };
}

/** Confidently explicit dislikes this item hits: penalised solo, excluded in a Party. */
export function explicitDislikes(item: RankableItem, prefs: Map<string, PrefState>) {
  return itemKeys(item)
    .filter(({ prefType, key }) => {
      const p = prefs.get(prefId(prefType, key));
      return p && p.explicit && p.value <= -0.5 && p.confidence >= 0.7;
    })
    .map(({ prefType, key }) => prefLabel(prefType, key));
}

export function scoreItem(item: RankableItem, ctx: RankingContext): Score {
  // Taste: confidence-weighted mean of matching preferences.
  const matches = itemKeys(item)
    .map(({ prefType, key }) => ({ prefType, key, pref: ctx.prefs.get(prefId(prefType, key)) }))
    .filter((m): m is typeof m & { pref: PrefState } => !!m.pref && m.pref.confidence > 0);
  const weightSum = matches.reduce((s, m) => s + m.pref.confidence, 0);
  const taste = weightSum
    ? matches.reduce((s, m) => s + m.pref.value * m.pref.confidence, 0) / weightSum
    : 0;
  const liked = matches
    .filter((m) => m.pref.value > 0.2)
    .sort((a, b) => b.pref.value - a.pref.value);
  const disliked = matches
    .filter((m) => m.pref.value < -0.2)
    .sort((a, b) => a.pref.value - b.pref.value);
  const names = (ms: typeof matches) =>
    ms.slice(0, 3).map((m) => prefLabel(m.prefType, m.key).toLowerCase());
  const tasteExplanation =
    matches.length === 0
      ? 'Nothing here we know your taste for yet.'
      : [
          liked.length ? `You like ${names(liked).join(', ')}.` : '',
          disliked.length ? `You're not keen on ${names(disliked).join(', ')}.` : '',
        ]
          .filter(Boolean)
          .join(' ') || 'Neutral for your taste.';

  // Popularity: rating, shrunk toward neutral when there are few ratings.
  const rating = item.rating;
  const popularity =
    rating && rating.count > 0
      ? clamp(((rating.average - 3) / 2) * Math.min(1, rating.count / 20))
      : 0;
  const popularityExplanation =
    rating && rating.count > 0
      ? `${rating.average.toFixed(1)}★ from ${rating.count} ${rating.count === 1 ? 'rating' : 'ratings'}.`
      : 'No ratings yet.';

  const { have, total } = pantryCoverage(item, ctx.pantryKeys);
  const pantry = total ? have / total : 0;

  const recent = ctx.recentIds.has(item.id);
  const freshness = recent ? -0.6 : 0.3;

  const components: ScoreComponent[] = [
    {
      key: 'taste',
      label: 'Your taste',
      weight: WEIGHTS.taste,
      value: round(taste),
      contribution: round(taste * WEIGHTS.taste),
      explanation: tasteExplanation,
    },
    {
      key: 'popularity',
      label: 'Popularity',
      weight: WEIGHTS.popularity,
      value: round(popularity),
      contribution: round(popularity * WEIGHTS.popularity),
      explanation: popularityExplanation,
    },
    {
      key: 'pantry',
      label: 'In your pantry',
      weight: WEIGHTS.pantry,
      value: round(pantry),
      contribution: round(pantry * WEIGHTS.pantry),
      explanation: total
        ? `You have ${have} of ${total} key ingredients.`
        : 'No key ingredients to check.',
    },
    {
      key: 'freshness',
      label: 'Variety',
      weight: WEIGHTS.freshness,
      value: freshness,
      contribution: round(freshness * WEIGHTS.freshness),
      explanation: recent
        ? 'You had this in the last two weeks.'
        : "You haven't had this recently.",
    },
  ];

  const dislikes = explicitDislikes(item, ctx.prefs);
  if (dislikes.length) {
    components.push({
      key: 'explicit_dislike',
      label: 'You said you dislike',
      weight: 1,
      value: -0.5,
      contribution: -0.5,
      explanation: `Contains ${dislikes.join(', ').toLowerCase()}, which you told us you dislike. (In a Meal Party this excludes it.)`,
    });
  }

  const total_ = round(clamp(components.reduce((s, c) => s + c.contribution, 0)));
  return { total: total_, components };
}

/** Average several members' scores component by component (Meal Party). */
export function averageScores(scores: Score[]): Score {
  if (scores.length === 1) return scores[0] as Score;
  const byKey = new Map<string, ScoreComponent[]>();
  for (const s of scores)
    for (const c of s.components) byKey.set(c.key, [...(byKey.get(c.key) ?? []), c]);
  const components = [...byKey.values()].map((cs) => {
    const first = cs[0] as ScoreComponent;
    const avg = (f: (c: ScoreComponent) => number) =>
      round(cs.reduce((s, c) => s + f(c), 0) / scores.length);
    return {
      ...first,
      value: avg((c) => c.value),
      contribution: avg((c) => c.contribution),
      explanation:
        first.key === 'taste'
          ? `Averaged across ${scores.length} members' tastes.`
          : first.explanation,
    };
  });
  return { total: round(clamp(components.reduce((s, c) => s + c.contribution, 0))), components };
}
