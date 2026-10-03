import type {
  Feed,
  GeneratedDraft,
  RankedRecipe,
  Recipe,
  RecipeDetail,
  RecipeDraft,
  RecipeSummary,
  SearchResults,
} from '@tastepilot/api-client';
import type { MockBackend } from '../backend';
import { CUISINES, FLAVORS, ingredientByKey } from '../data/ingredients';
import type { RecipeRow } from '../db';
import {
  pantryCoverage,
  scoreItem,
  type RankableItem,
  type RankingContext,
} from '../engine/ranking';
import { evaluateSafety } from '../engine/safety';
import { structureIngredients, matchIngredient } from '../engine/structure';
import { forbidden, notFound } from '../errors';
import { newId } from '../ids';
import { addEvidence, constraintRefs, prefsFor, userConstraints } from './profile';
import { toUserSummary, userById } from './users';

// --- Reading ---------------------------------------------------------------

export function recipeRating(b: MockBackend, row: RecipeRow) {
  const reviews = b.db.posts.filter((p) => p.recipeId === row.id && p.rating != null);
  const count = row.baseRating.count + reviews.length;
  if (count === 0) return { average: 0, count: 0 };
  const sum =
    row.baseRating.average * row.baseRating.count +
    reviews.reduce((s, p) => s + (p.rating ?? 0), 0);
  return { average: Math.round((sum / count) * 10) / 10, count };
}

export function toSummary(b: MockBackend, row: RecipeRow): RecipeSummary {
  const author = row.authorId ? b.db.users.find((u) => u.id === row.authorId) : undefined;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    cuisine: row.cuisine,
    tags: row.tags,
    timeMinutes: row.timeMinutes,
    emoji: row.emoji,
    color: row.color,
    source: row.source,
    author: author ? toUserSummary(author) : null,
    rating: recipeRating(b, row),
    published: row.published,
  };
}

export function toRecipe(b: MockBackend, row: RecipeRow): Recipe {
  return {
    ...toSummary(b, row),
    servings: row.servings,
    flavors: row.flavors,
    ingredients: structureIngredients(row.ingredients),
    steps: row.steps,
    createdAt: row.createdAt,
  };
}

export const rankable = (b: MockBackend, row: RecipeRow): RankableItem => ({
  id: row.id,
  ingredients: structureIngredients(row.ingredients),
  cuisine: row.cuisine,
  flavors: row.flavors,
  rating: recipeRating(b, row),
});

/** Visible to a user: catalog, anything published, and their own drafts. */
export function visibleRecipes(b: MockBackend, userId: string | null) {
  return b.db.recipes.filter(
    (r) => r.source === 'catalog' || r.published || (userId && r.authorId === userId),
  );
}

export function recipeFor(b: MockBackend, userId: string | null, id: string) {
  const row = b.db.recipes.find((r) => r.id === id);
  // Someone else's unpublished draft looks exactly like a missing recipe (no IDOR leak).
  if (!row || !(row.source === 'catalog' || row.published || (userId && row.authorId === userId))) {
    throw notFound('Recipe not found');
  }
  return row;
}

export function rankingContext(b: MockBackend, userId: string): RankingContext {
  const twoWeeksAgo = b.dateOffset(-14);
  return {
    prefs: prefsFor(b, userId),
    pantryKeys: new Set(
      b.db.pantry
        .filter((p) => p.userId === userId)
        .map((p) => matchIngredient(p.name)?.key)
        .filter((k): k is string => !!k),
    ),
    recentIds: new Set(
      b.db.foodLogs
        .filter((l) => l.userId === userId && l.recipeId && l.eatenOn >= twoWeeksAgo)
        .map((l) => l.recipeId as string),
    ),
  };
}

export function rankRecipes(b: MockBackend, userId: string, rows: RecipeRow[]): RankedRecipe[] {
  const ctx = rankingContext(b, userId);
  const constraints = constraintRefs(b, [userId], { named: false });
  const now = b.nowIso();
  return rows
    .map((row) => {
      const item = rankable(b, row);
      return {
        recipe: toSummary(b, row),
        safety: evaluateSafety(item.ingredients, constraints, now),
        score: scoreItem(item, ctx),
        pantryMatch: pantryCoverage(item, ctx.pantryKeys),
      };
    })
    .sort((a, c) => c.score.total - a.score.total);
}

const notConflict = (r: RankedRecipe) => r.safety.status !== 'conflict';

export function homeFeed(b: MockBackend, userId: string): Feed {
  // Conflicts are never recommended; unverified items stay, clearly badged.
  const ranked = rankRecipes(b, userId, visibleRecipes(b, userId)).filter(notConflict);
  const pantry = ranked.filter(
    (r) => r.pantryMatch.total > 0 && r.pantryMatch.have / r.pantryMatch.total >= 0.5,
  );
  const quick = ranked.filter((r) => r.recipe.timeMinutes <= 30);
  return {
    sections: [
      {
        key: 'top',
        title: 'Top picks for you',
        subtitle: 'Ranked by your taste profile',
        items: ranked.slice(0, 6),
      },
      {
        key: 'pantry',
        title: 'Cook from your pantry',
        subtitle: 'You already have most of the ingredients',
        items: pantry.slice(0, 6),
      },
      {
        key: 'quick',
        title: 'Quick weeknight',
        subtitle: '30 minutes or less',
        items: quick.slice(0, 6),
      },
    ].filter((s) => s.items.length > 0),
  };
}

export function discover(b: MockBackend, userId: string): Feed {
  const ranked = rankRecipes(b, userId, visibleRecipes(b, userId)).filter(notConflict);
  const popularity = (r: RankedRecipe) =>
    r.score.components.find((c) => c.key === 'popularity')?.value ?? 0;
  const triedCuisines = new Set(
    b.db.foodLogs
      .filter((l) => l.userId === userId && l.recipeId)
      .map((l) => b.db.recipes.find((r) => r.id === l.recipeId)?.cuisine),
  );
  const followed = new Set(
    b.db.follows.filter((f) => f.followerId === userId).map((f) => f.followeeId),
  );
  return {
    sections: [
      {
        key: 'trending',
        title: 'Trending',
        subtitle: 'Popular with the community, ordered by how well they fit you',
        items: [...ranked]
          .sort((a, c) => popularity(c) - popularity(a))
          .slice(0, 8)
          .sort((a, c) => c.score.total - a.score.total),
      },
      {
        key: 'new-cuisines',
        title: 'New to you',
        subtitle: "Cuisines you haven't cooked yet",
        items: ranked.filter((r) => !triedCuisines.has(r.recipe.cuisine)).slice(0, 6),
      },
      {
        key: 'following',
        title: 'From cooks you follow',
        subtitle: 'Fresh from your community',
        items: ranked
          .filter((r) => r.recipe.author && followed.has(r.recipe.author.id))
          .slice(0, 6),
      },
    ].filter((s) => s.items.length > 0),
  };
}

export function search(
  b: MockBackend,
  userId: string,
  params: { q: string; tags: string[]; maxTime: number | null; hideConflicts: boolean },
): SearchResults {
  const terms = params.q.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = visibleRecipes(b, userId).filter((row) => {
    const canonical = structureIngredients(row.ingredients).map(
      (i) => i.canonical?.replace(/_/g, ' ') ?? '',
    );
    const haystack = [
      row.title,
      row.description,
      row.cuisine,
      ...row.tags,
      ...row.ingredients,
      ...canonical,
    ]
      .join(' ')
      .toLowerCase();
    return (
      terms.every((t) => haystack.includes(t)) &&
      params.tags.every((t) => row.tags.includes(t)) &&
      (params.maxTime == null || row.timeMinutes <= params.maxTime)
    );
  });
  const ranked = rankRecipes(b, userId, matches);
  const conflicts = ranked.filter((r) => !notConflict(r));
  return {
    query: params.q,
    results: params.hideConflicts
      ? ranked.filter(notConflict)
      : [...ranked.filter(notConflict), ...conflicts],
    hiddenConflicts: params.hideConflicts ? conflicts.length : 0,
  };
}

export function allTags(b: MockBackend) {
  return [...new Set(b.db.recipes.flatMap((r) => r.tags))].sort();
}

export function recipeSafety(b: MockBackend, userId: string, id: string) {
  const row = recipeFor(b, userId, id);
  return evaluateSafety(
    structureIngredients(row.ingredients),
    constraintRefs(b, [userId], { named: false }),
    b.nowIso(),
  );
}

export function recipeDetail(b: MockBackend, userId: string, id: string): RecipeDetail {
  const row = recipeFor(b, userId, id);
  const ctx = rankingContext(b, userId);
  const item = rankable(b, row);
  return {
    recipe: toRecipe(b, row),
    score: scoreItem(item, ctx),
    pantryMatch: pantryCoverage(item, ctx.pantryKeys),
    myFeedback:
      b.db.feedback.find((f) => f.userId === userId && f.recipeId === id)?.feedback ?? null,
    canEdit: row.authorId === userId,
  };
}

/** Like/dislike on a recipe: inferred evidence for its ingredients, cuisine and flavors. */
export function setFeedback(
  b: MockBackend,
  userId: string,
  id: string,
  feedback: 'like' | 'dislike' | null,
) {
  const row = recipeFor(b, userId, id);
  b.db.feedback = b.db.feedback.filter((f) => !(f.userId === userId && f.recipeId === id));
  b.db.evidence = b.db.evidence.filter(
    (e) => !(e.userId === userId && e.sourceType === 'recipe_feedback' && e.sourceId === id),
  );
  if (!feedback) return;
  b.db.feedback.push({ userId, recipeId: id, feedback, createdAt: b.nowIso() });
  const signal = feedback === 'like' ? 0.7 : -0.7;
  const description = `You ${feedback === 'like' ? 'liked' : 'disliked'} ${row.title}`;
  const keys = evidenceKeys(row.ingredients, row.cuisine, row.flavors);
  addEvidence(
    b,
    keys.map((k) => ({
      userId,
      ...k,
      kind: 'feedback' as const,
      signal,
      explicit: false,
      description,
      sourceType: 'recipe_feedback' as const,
      sourceId: id,
    })),
  );
}

export function evidenceKeys(ingredients: string[], cuisine: string | null, flavors: string[]) {
  const keys = new Map<string, { prefType: 'ingredient' | 'cuisine' | 'flavor'; key: string }>();
  for (const ing of structureIngredients(ingredients)) {
    if (ing.canonical && !ingredientByKey(ing.canonical)?.staple) {
      keys.set(`i:${ing.canonical}`, { prefType: 'ingredient', key: ing.canonical });
    }
  }
  if (cuisine) keys.set(`c:${cuisine}`, { prefType: 'cuisine', key: cuisine });
  for (const f of flavors) keys.set(`f:${f}`, { prefType: 'flavor', key: f });
  return [...keys.values()];
}

// --- Authoring and AI-assisted generation ----------------------------------

const TEMPLATES: Array<{
  match: RegExp;
  title: string;
  cuisine: string;
  emoji: string;
  time: number;
  tags: string[];
  ingredients: string[];
  steps: string[];
}> = [
  {
    match: /curry/,
    title: 'Weeknight Coconut Curry',
    cuisine: 'thai',
    emoji: '🍛',
    time: 35,
    tags: ['dinner', 'one-pot'],
    ingredients: [
      '1 onion',
      '3 garlic cloves',
      '1 tbsp fresh ginger',
      '400 ml coconut milk',
      '2 tbsp curry paste',
      '2 cups spinach',
      'jasmine rice',
      'lime',
    ],
    steps: [
      'Soften the onion, garlic and ginger in a little oil.',
      'Stir in the curry paste for a minute, then add coconut milk and simmer 15 minutes.',
      'Fold in the spinach until wilted.',
      'Finish with lime and serve over rice.',
    ],
  },
  {
    match: /soup|stew/,
    title: 'Cozy Vegetable Soup',
    cuisine: 'american',
    emoji: '🍲',
    time: 40,
    tags: ['dinner', 'one-pot', 'make-ahead'],
    ingredients: [
      '1 onion',
      '2 carrots',
      '2 potatoes',
      '3 garlic cloves',
      '1 l vegetable stock',
      '1 can chickpeas',
      'parsley',
      'salt',
      'black pepper',
    ],
    steps: [
      'Sweat the onion, carrot and garlic.',
      'Add potatoes and stock; simmer 20 minutes.',
      'Add chickpeas and warm through.',
      'Season and finish with parsley.',
    ],
  },
  {
    match: /salad|bowl/,
    title: 'Bright Grain Bowl',
    cuisine: 'mediterranean',
    emoji: '🥗',
    time: 25,
    tags: ['lunch', 'quick'],
    ingredients: [
      '1 cup quinoa',
      '1 cucumber',
      'cherry tomatoes',
      '1 can chickpeas',
      'parsley',
      'lemon juice',
      'olive oil',
      'salt',
    ],
    steps: [
      'Cook the quinoa and let it cool slightly.',
      'Chop the vegetables.',
      'Toss everything with lemon, olive oil and salt.',
    ],
  },
  {
    match: /pasta|noodle/,
    title: 'Garlicky Greens Pasta',
    cuisine: 'italian',
    emoji: '🍝',
    time: 25,
    tags: ['dinner', 'quick'],
    ingredients: [
      '300 g pasta',
      '4 garlic cloves',
      '1 bunch kale',
      'chili flakes',
      'olive oil',
      'lemon zest',
      'parmesan',
    ],
    steps: [
      'Boil the pasta in salted water.',
      'Gently fry garlic and chili in olive oil, add kale to wilt.',
      'Toss with pasta, a splash of pasta water and lemon zest.',
      'Finish with parmesan.',
    ],
  },
  {
    match: /taco|mexican|burrito/,
    title: 'Black Bean Tacos',
    cuisine: 'mexican',
    emoji: '🌮',
    time: 20,
    tags: ['dinner', 'quick'],
    ingredients: [
      'corn tortillas',
      '1 can black beans',
      '1 avocado',
      'red onion',
      'cilantro',
      'lime',
      'ground cumin',
      'chili',
    ],
    steps: [
      'Warm the beans with cumin and chili.',
      'Char the tortillas.',
      'Fill with beans, avocado, onion and cilantro; squeeze over lime.',
    ],
  },
  {
    match: /stir.?fry|wok|fried rice/,
    title: 'Ginger Veg Stir-Fry',
    cuisine: 'chinese',
    emoji: '🥢',
    time: 20,
    tags: ['dinner', 'quick'],
    ingredients: [
      '2 cups broccoli',
      '1 bell pepper',
      '2 tbsp fresh ginger',
      '3 garlic cloves',
      'tamari',
      'rice',
      'scallions',
      'neutral oil',
    ],
    steps: [
      'Get the wok very hot with oil.',
      'Stir-fry broccoli and pepper 3 minutes.',
      'Add ginger and garlic, then tamari.',
      'Serve over rice with scallions.',
    ],
  },
  {
    match: /dessert|cake|cookie|sweet|bake/,
    title: 'Simple Berry Crumble',
    cuisine: 'american',
    emoji: '🍓',
    time: 45,
    tags: ['dessert', 'baking'],
    ingredients: [
      '3 cups berries',
      '1 cup rolled oats',
      '1/2 cup flour',
      '1/3 cup brown sugar',
      '6 tbsp butter',
      'cinnamon',
    ],
    steps: [
      'Heat the oven to 190°C.',
      'Rub oats, flour, sugar, butter and cinnamon into a crumble.',
      'Spread berries in a dish, top with crumble, bake 30 minutes.',
    ],
  },
];

const DEFAULT_TEMPLATE = {
  match: /./,
  title: 'Herby Roast Vegetables',
  cuisine: 'mediterranean',
  emoji: '🥕',
  time: 40,
  tags: ['dinner', 'sheet-pan'],
  ingredients: [
    '2 potatoes',
    '2 carrots',
    '1 zucchini',
    '1 red onion',
    'olive oil',
    'oregano',
    'salt',
    'black pepper',
  ],
  steps: [
    'Heat the oven to 220°C.',
    'Chop and toss the vegetables with oil, oregano and seasoning.',
    'Roast 30 minutes, turning once.',
  ],
};

/**
 * Stub for AI-assisted generation. A real model would draft here; either way
 * the draft is just text until it's saved and run through ingredient
 * structuring and the safety engine. The AI never certifies allergens.
 */
export function generateDraft(
  b: MockBackend,
  userId: string,
  prompt: string,
  usePantry: boolean,
): GeneratedDraft {
  const p = prompt.toLowerCase();
  const template = TEMPLATES.find((t) => t.match.test(p)) ?? DEFAULT_TEMPLATE;
  const cuisine = CUISINES.find((c) => p.includes(c)) ?? template.cuisine;
  const notes = [
    'Drafted from your prompt. Edit anything before saving.',
    'Ingredients are checked against verified allergen data when you save. The assistant never certifies allergens.',
  ];
  const ingredients = [...template.ingredients];

  if (usePantry) {
    const pantry = b.db.pantry
      .filter((i) => i.userId === userId)
      .map((i) => i.name)
      .filter((name) => !ingredients.some((ing) => ing.toLowerCase().includes(name.toLowerCase())))
      .slice(0, 3);
    if (pantry.length) {
      ingredients.push(...pantry);
      notes.push(`Added from your pantry: ${pantry.join(', ')}.`);
    }
  }

  const constraints = userConstraints(b, userId);
  if (constraints.length) {
    notes.push(
      'Heads up: your allergies and diets are checked after you save, not assumed by the draft.',
    );
  }

  const flavor = FLAVORS.find((f) => p.includes(f));
  return {
    draft: {
      title: flavor
        ? `${flavor[0]?.toUpperCase()}${flavor.slice(1)} ${template.title}`
        : template.title,
      description: `A ${cuisine} recipe drafted for: "${prompt.trim()}".`,
      cuisine,
      timeMinutes: template.time,
      servings: 4,
      tags: template.tags,
      ingredients,
      steps: template.steps,
    },
    notes,
  };
}

const PALETTE = [
  '#fde68a',
  '#fecaca',
  '#bbf7d0',
  '#bfdbfe',
  '#ddd6fe',
  '#fbcfe8',
  '#fed7aa',
  '#a7f3d0',
];

function flavorsFor(draft: RecipeDraft) {
  const text = [draft.title, draft.description, ...draft.ingredients].join(' ').toLowerCase();
  const flavors = new Set<string>();
  if (/chili|jalapeno|gochujang|spicy|curry/.test(text)) flavors.add('spicy');
  if (/basil|parsley|cilantro|mint|herb/.test(text)) flavors.add('herby');
  if (/lemon|lime|vinegar/.test(text)) flavors.add('fresh');
  if (/sugar|honey|maple|berries|chocolate/.test(text)) flavors.add('sweet');
  if (/cream|butter|cheese|coconut milk/.test(text)) flavors.add('creamy');
  if (/soy|miso|mushroom|parmesan|fish sauce/.test(text)) flavors.add('umami');
  return [...flavors];
}

export function createRecipe(
  b: MockBackend,
  userId: string,
  draft: RecipeDraft,
  source: 'community' | 'ai_generated',
) {
  const row: RecipeRow = {
    id: newId('rec'),
    title: draft.title,
    description: draft.description,
    cuisine: draft.cuisine.toLowerCase(),
    tags: draft.tags,
    flavors: flavorsFor(draft),
    timeMinutes: draft.timeMinutes,
    servings: draft.servings,
    emoji: '🍽️',
    color: PALETTE[b.db.recipes.length % PALETTE.length] as string,
    source,
    authorId: userId,
    ingredients: draft.ingredients,
    steps: draft.steps,
    published: false,
    baseRating: { average: 0, count: 0 },
    createdAt: b.nowIso(),
  };
  b.db.recipes.push(row);
  return recipeDetail(b, userId, row.id);
}

export function updateRecipe(b: MockBackend, userId: string, id: string, draft: RecipeDraft) {
  const row = recipeFor(b, userId, id);
  if (row.authorId !== userId) throw forbidden('Only the author can edit this recipe.');
  Object.assign(row, {
    title: draft.title,
    description: draft.description,
    cuisine: draft.cuisine.toLowerCase(),
    tags: draft.tags,
    flavors: flavorsFor(draft),
    timeMinutes: draft.timeMinutes,
    servings: draft.servings,
    ingredients: draft.ingredients,
    steps: draft.steps,
  });
  return recipeDetail(b, userId, id);
}

export function setPublished(b: MockBackend, userId: string, id: string, published: boolean) {
  const row = recipeFor(b, userId, id);
  if (row.authorId !== userId) throw forbidden('Only the author can publish this recipe.');
  row.published = published;
  return recipeDetail(b, userId, id);
}

export function myRecipes(b: MockBackend, userId: string) {
  return b.db.recipes
    .filter((r) => r.authorId === userId)
    .sort((a, c) => c.createdAt.localeCompare(a.createdAt))
    .map((r) => toSummary(b, r));
}

export function publicRecipe(b: MockBackend, id: string) {
  const row = b.db.recipes.find((r) => r.id === id && (r.source === 'catalog' || r.published));
  if (!row) throw notFound('Recipe not found');
  return toRecipe(b, row);
}

export { userById };
