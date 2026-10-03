import type { Ingredient, SafetyReason, SafetyResult } from '@tastepilot/api-client';
import {
  ALLERGENS,
  DIET_RULES,
  DIETS,
  ingredientByKey,
  type AllergenKey,
  type DietKey,
} from '../data/ingredients';

export interface ConstraintRef {
  kind: 'allergy' | 'diet';
  key: string;
  /** Whose constraint this is (Party / household checks); null for "you". */
  memberName: string | null;
}

export function constraintLabel(kind: 'allergy' | 'diet', key: string) {
  if (kind === 'allergy') return ALLERGENS[key as AllergenKey] ?? key;
  return DIETS[key as DietKey] ?? key;
}

function conflicts(ingredient: Ingredient, constraint: ConstraintRef) {
  if (!ingredient.canonical) return false;
  const entry = ingredientByKey(ingredient.canonical);
  if (!entry) return false;
  if (constraint.kind === 'allergy') {
    return entry.allergens.includes(constraint.key as AllergenKey);
  }
  const rule = DIET_RULES[constraint.key as DietKey];
  if (!rule) return false;
  return (
    rule.excludes.includes(entry.category) ||
    rule.allergens.some((a) => entry.allergens.includes(a))
  );
}

/**
 * The one canonical safety decision. Tri-state and fail-closed:
 *  - conflict:   an ingredient hits a constraint
 *  - unverified: no conflict found, but an ingredient isn't in the verified
 *                dataset, so we can't confirm it's safe
 *  - safe:       every ingredient is verified and none hit a constraint
 */
export function evaluateSafety(
  ingredients: Ingredient[],
  constraints: ConstraintRef[],
  now: string,
): SafetyResult {
  if (constraints.length === 0) {
    return { status: 'safe', reasons: [], checkedAt: now };
  }

  const reasons: SafetyReason[] = [];
  for (const ingredient of ingredients) {
    if (!ingredient.canonical) {
      reasons.push({
        kind: 'unmapped_ingredient',
        ingredient: ingredient.text,
        constraintKey: null,
        constraintLabel: null,
        memberName: null,
      });
      continue;
    }
    for (const constraint of constraints) {
      if (conflicts(ingredient, constraint)) {
        reasons.push({
          kind: 'conflict',
          ingredient: ingredient.text,
          constraintKey: constraint.key,
          constraintLabel: constraintLabel(constraint.kind, constraint.key),
          memberName: constraint.memberName,
        });
      }
    }
  }

  const status = reasons.some((r) => r.kind === 'conflict')
    ? 'conflict'
    : reasons.length > 0
      ? 'unverified'
      : 'safe';
  return { status, reasons, checkedAt: now };
}
