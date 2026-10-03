import { describe, expect, it } from 'vitest';
import { parseStatement } from '../engine/parse';
import { applyEvidence, EMPTY_PREF, replayEvidence } from '../engine/preferences';
import { evaluateSafety } from '../engine/safety';
import { matchIngredient, structureIngredients } from '../engine/structure';

const NOW = '2026-10-03T12:00:00.000Z';

describe('ingredient structuring', () => {
  it.each([
    ['2 tbsp peanut butter', 'peanut_butter'],
    ['3 tbsp unsalted butter', 'butter'],
    ['1 butternut squash', 'butternut_squash'],
    ['pinch of nutmeg', 'nutmeg'],
    ['1 cup oat milk', 'oat_milk'],
    ['400 ml coconut milk', 'coconut_milk'],
    ['2 large eggs', 'egg'],
    ['1 eggplant', 'eggplant'],
    ['1/3 cup pine nuts', 'pine_nut'],
    ['1 cup glutinous rice', 'rice'],
    ['1 tsp chili flakes', 'chili'],
  ])('maps "%s" to %s using word boundaries and longest match', (text, key) => {
    expect(matchIngredient(text)?.key).toBe(key);
  });

  it.each([
    '2 tbsp curry paste',
    'kimchi',
    'chili crisp',
    'house spice blend',
    'peanutty sauce',
    'tomato sauce',
    'garlic powder',
  ])('leaves "%s" unmapped rather than guessing', (text) => {
    expect(matchIngredient(text)).toBeNull();
  });
});

describe('safety engine', () => {
  const ingredients = (...texts: string[]) => structureIngredients(texts);

  it('is safe when every ingredient is verified and nothing conflicts', () => {
    const r = evaluateSafety(
      ingredients('rice', 'chicken thighs'),
      [{ kind: 'allergy', key: 'peanut', memberName: null }],
      NOW,
    );
    expect(r.status).toBe('safe');
  });

  it('flags a conflict with the ingredient and constraint that caused it', () => {
    const r = evaluateSafety(
      ingredients('rice', '1/3 cup pine nuts'),
      [{ kind: 'allergy', key: 'tree_nut', memberName: 'Alex' }],
      NOW,
    );
    expect(r.status).toBe('conflict');
    expect(r.reasons).toContainEqual(
      expect.objectContaining({
        kind: 'conflict',
        ingredient: '1/3 cup pine nuts',
        constraintKey: 'tree_nut',
        memberName: 'Alex',
      }),
    );
  });

  it('fails closed: an unmapped ingredient makes the result unverified, never safe', () => {
    const r = evaluateSafety(
      ingredients('rice', 'curry paste'),
      [{ kind: 'allergy', key: 'shellfish', memberName: null }],
      NOW,
    );
    expect(r.status).toBe('unverified');
    expect(r.reasons[0]).toMatchObject({ kind: 'unmapped_ingredient', ingredient: 'curry paste' });
  });

  it('keeps tree nuts and peanuts separate', () => {
    const treeNut = [{ kind: 'allergy' as const, key: 'tree_nut', memberName: null }];
    expect(evaluateSafety(ingredients('roasted peanuts'), treeNut, NOW).status).toBe('safe');
    expect(evaluateSafety(ingredients('cashews'), treeNut, NOW).status).toBe('conflict');
  });

  it('applies diets by category', () => {
    const vegan = [{ kind: 'diet' as const, key: 'vegan', memberName: null }];
    expect(evaluateSafety(ingredients('honey'), vegan, NOW).status).toBe('conflict');
    expect(evaluateSafety(ingredients('tofu', 'rice'), vegan, NOW).status).toBe('safe');
    const vegetarian = [{ kind: 'diet' as const, key: 'vegetarian', memberName: null }];
    expect(evaluateSafety(ingredients('fish sauce'), vegetarian, NOW).status).toBe('conflict');
  });
});

describe('natural-language parsing', () => {
  it('understands "allergic to tree nuts" without also blocking peanuts', () => {
    const r = parseStatement("I'm allergic to tree nuts");
    expect(r.constraints).toEqual([
      expect.objectContaining({ kind: 'allergy', key: 'tree_nut', rule: 'allergy.allergic_to' }),
    ]);
  });

  it('refuses to guess on ambiguous "nuts"', () => {
    const r = parseStatement("I'm allergic to nuts");
    expect(r.constraints).toEqual([]);
    expect(r.unrecognized[0]).toMatchObject({
      text: 'nuts',
      hint: expect.stringContaining('tree nuts, peanuts'),
    });
  });

  it('parses diets, likes and dislikes in one statement', () => {
    const r = parseStatement(
      "I'm vegetarian. I love spicy food and thai food, but I don't like cilantro.",
    );
    expect(r.constraints.map((c) => c.key)).toEqual(['vegetarian']);
    expect(r.preferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'spicy', sentiment: 'like' }),
        expect.objectContaining({ key: 'thai', sentiment: 'like' }),
        expect.objectContaining({ key: 'cilantro', sentiment: 'dislike' }),
      ]),
    );
    expect(
      r.preferences.find((p) => p.key === 'cilantro' && p.sentiment === 'like'),
    ).toBeUndefined();
  });

  it('does not read "not a fan of" as a like', () => {
    const r = parseStatement("I'm not a fan of mushrooms");
    expect(r.preferences).toEqual([
      expect.objectContaining({ key: 'mushroom', sentiment: 'dislike' }),
    ]);
  });

  it('handles celiac and lactose intolerance', () => {
    expect(parseStatement('I have celiac disease').constraints[0]).toMatchObject({
      kind: 'allergy',
      key: 'gluten',
    });
    expect(parseStatement("I'm lactose intolerant").constraints[0]).toMatchObject({
      kind: 'diet',
      key: 'dairy_free',
    });
  });

  it('reports unknown allergens instead of inventing them', () => {
    const r = parseStatement("I'm allergic to kiwi");
    expect(r.constraints).toEqual([]);
    expect(r.unrecognized[0]?.text).toBe('kiwi');
  });
});

describe('preference model', () => {
  const ev = (signal: number, explicit: boolean, day: number) => ({
    prefType: 'ingredient' as const,
    key: 'cilantro',
    signal,
    explicit,
    createdAt: `2026-09-${String(day).padStart(2, '0')}T00:00:00Z`,
  });

  it('moves strongly and gains confidence on an explicit statement', () => {
    const s = applyEvidence(EMPTY_PREF, ev(-1, true, 1));
    expect(s.value).toBeLessThanOrEqual(-0.8);
    expect(s.confidence).toBeGreaterThanOrEqual(0.9);
    expect(s.explicit).toBe(true);
  });

  it('moves gradually on inferred evidence, with a shrinking step', () => {
    const one = applyEvidence(EMPTY_PREF, ev(1, false, 1));
    const two = applyEvidence(one, ev(1, false, 2));
    expect(one.value).toBeGreaterThan(0);
    expect(one.value).toBeLessThan(0.5);
    expect(two.value - one.value).toBeLessThan(one.value);
    expect(two.confidence).toBeLessThanOrEqual(0.8);
  });

  it('damps inferred evidence that would erode a confident explicit preference', () => {
    const stated = applyEvidence(EMPTY_PREF, ev(-1, true, 1));
    const eroded = replayEvidence([
      ev(-1, true, 1),
      ev(1, false, 2),
      ev(1, false, 3),
      ev(1, false, 4),
    ]);
    expect(eroded.value).toBeLessThan(stated.value + 0.2);
    expect(eroded.value).toBeLessThan(-0.6);
  });
});
