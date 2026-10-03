import type { StatementParse } from '@tastepilot/api-client';
import { ALLERGENS, CUISINES, DIETS, FLAVORS, type AllergenKey } from '../data/ingredients';
import { matchIngredient } from './structure';

/**
 * Fixed, auditable rule set for natural-language allergy and preference
 * statements. No open-ended inference: if a phrase doesn't match a rule
 * exactly, it is reported back as unrecognized rather than guessed.
 */

type Constraint = StatementParse['constraints'][number];
type Pref = StatementParse['preferences'][number];

/** Allergen vocabulary. "nuts" is deliberately ambiguous (tree nuts vs peanuts). */
const ALLERGEN_TERMS: Record<string, AllergenKey> = {
  'tree nuts': 'tree_nut',
  'tree nut': 'tree_nut',
  almonds: 'tree_nut',
  almond: 'tree_nut',
  cashews: 'tree_nut',
  cashew: 'tree_nut',
  walnuts: 'tree_nut',
  walnut: 'tree_nut',
  pecans: 'tree_nut',
  pistachios: 'tree_nut',
  hazelnuts: 'tree_nut',
  'pine nuts': 'tree_nut',
  peanuts: 'peanut',
  peanut: 'peanut',
  dairy: 'milk',
  milk: 'milk',
  lactose: 'milk',
  cheese: 'milk',
  eggs: 'egg',
  egg: 'egg',
  gluten: 'gluten',
  wheat: 'gluten',
  soy: 'soy',
  soya: 'soy',
  fish: 'fish',
  shellfish: 'shellfish',
  shrimp: 'shellfish',
  prawns: 'shellfish',
  crab: 'shellfish',
  lobster: 'shellfish',
  sesame: 'sesame',
};

const AMBIGUOUS: Record<string, string> = {
  nuts: 'Did you mean tree nuts, peanuts, or both? Peanuts are legumes, so we track them separately.',
  nut: 'Did you mean tree nuts, peanuts, or both? Peanuts are legumes, so we track them separately.',
  seafood: 'Did you mean fish, shellfish, or both?',
};

const DIET_PATTERNS: Array<{ rule: string; pattern: RegExp; key: keyof typeof DIETS }> = [
  { rule: 'diet.vegan', pattern: /\b(i'?m|i am|we'?re|am)?\s*(a\s+)?vegan\b/, key: 'vegan' },
  {
    rule: 'diet.vegetarian',
    pattern: /\b(i'?m|i am|we'?re)?\s*(a\s+)?vegetarian\b/,
    key: 'vegetarian',
  },
  { rule: 'diet.pescatarian', pattern: /\bpescatarian\b/, key: 'pescatarian' },
  {
    rule: 'diet.gluten_free',
    pattern: /\bgluten[- ]free\b|\bgluten intolerant\b/,
    key: 'gluten_free',
  },
  {
    rule: 'diet.dairy_free',
    pattern: /\bdairy[- ]free\b|\blactose intolerant\b|\bno dairy\b/,
    key: 'dairy_free',
  },
];

const ALLERGY_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
  { rule: 'allergy.allergic_to', pattern: /\ballergic to ([^.;!?]+)/g },
  { rule: 'allergy.x_allergy', pattern: /\b([a-z ]+?) allerg(?:y|ies)\b/g },
  { rule: 'allergy.cannot_eat', pattern: /\b(?:can'?t|cannot|can not) (?:eat|have) ([^.;!?]+)/g },
];

const LIKE_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
  {
    rule: 'pref.love',
    pattern: /\bi (?:really |absolutely )?(?:love|like|enjoy|adore) ([^.;!?]+)/g,
  },
  { rule: 'pref.fan_of', pattern: /\b(?:big |huge )?fan of ([^.;!?]+)/g },
];

const DISLIKE_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
  {
    rule: 'pref.dislike',
    pattern:
      /\bi (?:really )?(?:hate|dislike|don'?t like|do not like|can'?t stand|avoid) ([^.;!?]+)/g,
  },
  { rule: 'pref.not_fan', pattern: /\bnot (?:a |much of a )?fan of ([^.;!?]+)/g },
];

function splitList(phrase: string) {
  return phrase
    .replace(/\b(but|except|though|although)\b.*$/, '')
    .split(/,|\band\b|\bor\b|&|\//)
    .map((s) =>
      s
        .replace(
          /\b(food|foods|dishes|stuff|things|very much|a lot|anything with|anything|any|all|the|really|so|too)\b/g,
          ' ',
        )
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((s) => s.length > 1);
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function preferenceFor(term: string): Omit<Pref, 'sentiment' | 'matchedText' | 'rule'> | null {
  const flavor = FLAVORS.find((f) => term === f || term === `${f} food`);
  if (flavor) return { prefType: 'flavor', key: flavor, label: titleCase(flavor) };
  const cuisine = CUISINES.find((c) => term === c || term === `${c} food`);
  if (cuisine) return { prefType: 'cuisine', key: cuisine, label: titleCase(cuisine) };
  if (term === 'spice' || term === 'heat')
    return { prefType: 'flavor', key: 'spicy', label: 'Spicy' };
  const entry = matchIngredient(term);
  if (entry) return { prefType: 'ingredient', key: entry.key, label: titleCase(entry.label) };
  return null;
}

export function parseStatement(text: string): StatementParse {
  const input = text.toLowerCase().replace(/[’']/g, "'");
  const result: StatementParse = { text, constraints: [], preferences: [], unrecognized: [] };
  const seenConstraint = new Set<string>();
  const seenPref = new Set<string>();

  const addConstraint = (c: Constraint) => {
    const id = `${c.kind}:${c.key}`;
    if (seenConstraint.has(id)) return;
    seenConstraint.add(id);
    result.constraints.push(c);
  };
  const addPref = (p: Pref) => {
    const id = `${p.prefType}:${p.key}`;
    if (seenPref.has(id)) return;
    seenPref.add(id);
    result.preferences.push(p);
  };
  const unrecognized = (term: string, hint: string | null) => {
    if (!result.unrecognized.some((u) => u.text === term))
      result.unrecognized.push({ text: term, hint });
  };

  if (/\bc(o)?eliac\b/.test(input)) {
    addConstraint({
      kind: 'allergy',
      key: 'gluten',
      label: ALLERGENS.gluten,
      matchedText: 'celiac',
      rule: 'allergy.celiac',
    });
  }
  for (const { rule, pattern, key } of DIET_PATTERNS) {
    const m = input.match(pattern);
    if (m) {
      addConstraint({ kind: 'diet', key, label: DIETS[key], matchedText: m[0].trim(), rule });
    }
  }

  for (const { rule, pattern } of ALLERGY_PATTERNS) {
    for (const m of input.matchAll(pattern)) {
      const phrase = m[1] ?? '';
      for (const term of splitList(phrase)) {
        const allergen = ALLERGEN_TERMS[term];
        if (allergen) {
          addConstraint({
            kind: 'allergy',
            key: allergen,
            label: ALLERGENS[allergen],
            matchedText: term,
            rule,
          });
        } else if (AMBIGUOUS[term]) {
          unrecognized(term, AMBIGUOUS[term]);
        } else if (rule === 'allergy.cannot_eat') {
          // "can't eat X" for a non-allergen is a strong dislike, not a constraint.
          const pref = preferenceFor(term);
          if (pref) addPref({ ...pref, sentiment: 'dislike', matchedText: term, rule });
          else unrecognized(term, null);
        } else if (rule === 'allergy.allergic_to') {
          unrecognized(
            term,
            "This isn't in our verified allergen list. Add it as a structured allergy or tell your host directly.",
          );
        }
      }
    }
  }

  const prefRules = [
    ...LIKE_PATTERNS.map((p) => ({ ...p, sentiment: 'like' as const })),
    ...DISLIKE_PATTERNS.map((p) => ({ ...p, sentiment: 'dislike' as const })),
  ];
  for (const { rule, pattern, sentiment } of prefRules) {
    for (const m of input.matchAll(pattern)) {
      // "not a fan of X" also contains "fan of X": skip negated like-matches.
      const before = input.slice(Math.max(0, (m.index ?? 0) - 12), m.index ?? 0);
      if (sentiment === 'like' && /\bnot\b|n't|\bnever\b/.test(before)) continue;
      for (const term of splitList(m[1] ?? '')) {
        const pref = preferenceFor(term);
        if (pref) addPref({ ...pref, sentiment, matchedText: term, rule });
        else unrecognized(term, null);
      }
    }
  }

  if (
    result.constraints.length === 0 &&
    result.preferences.length === 0 &&
    result.unrecognized.length === 0
  ) {
    result.unrecognized.push({
      text: text.trim(),
      hint: 'Try phrasing like "I\'m allergic to shellfish", "I\'m vegetarian", or "I love spicy food".',
    });
  }
  return result;
}
