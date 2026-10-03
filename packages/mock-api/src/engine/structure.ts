import type { Ingredient } from '@tastepilot/api-client';
import { INGREDIENTS, type IngredientEntry } from '../data/ingredients';

/** Every alias, longest first, so "peanut butter" wins over "butter". */
const ALIASES = INGREDIENTS.flatMap((entry) =>
  entry.aliases.map((alias) => ({ alias, entry })),
).sort((a, b) => b.alias.length - a.alias.length);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ALIAS_PATTERNS = ALIASES.map(({ alias, entry }) => ({
  entry,
  // Word-boundary match only: "peanut" must not match inside "peanutty",
  // and "nut" never matches "nutmeg" or "butternut".
  pattern: new RegExp(`(^|[^a-z])${escape(alias)}(?=$|[^a-z])`),
}));

/**
 * Words that turn an ingredient into a different, composite product. "chili
 * crisp" or "curry paste" is not "chili" or "curry": unless the whole phrase
 * is in the dataset, it stays unmapped (and therefore unverified).
 */
const COMPOUND_WORDS = new Set([
  'crisp',
  'paste',
  'sauce',
  'blend',
  'mix',
  'seasoning',
  'dressing',
  'spread',
  'powder',
  'marinade',
  'jam',
  'butter',
  'cream',
  'flavored',
  'flavoured',
  'substitute',
  'style',
]);

const QUANTITY =
  /^[\d\s/.,½¼¾⅓⅔-]*(cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|g|grams?|kg|ml|l|oz|ounces?|lbs?|pounds?|cans?|cloves?|pinch|handful|bunch|slices?|pieces?|large|small|medium)?\b\s*(of\s+)?/i;

export function normalizeIngredientText(text: string) {
  return text
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(QUANTITY, '')
    .replace(/[^a-z\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Map free ingredient text onto the verified dataset. Returns null when no
 * entry matches -- the caller must treat that ingredient as unverified.
 */
export function matchIngredient(text: string): IngredientEntry | null {
  const normalized = normalizeIngredientText(text);
  if (!normalized) return null;
  for (const { entry, pattern } of ALIAS_PATTERNS) {
    const match = pattern.exec(normalized);
    if (!match) continue;
    const after =
      normalized
        .slice(match.index + match[0].length)
        .trim()
        .split(' ')[0] ?? '';
    if (COMPOUND_WORDS.has(after)) return null;
    return entry;
  }
  return null;
}

export function structureIngredient(text: string): Ingredient {
  const entry = matchIngredient(text);
  return {
    text: text.trim(),
    canonical: entry?.key ?? null,
    allergens: entry ? [...entry.allergens] : [],
  };
}

export const structureIngredients = (texts: string[]) => texts.map(structureIngredient);
