import { beforeEach, describe, expect, it } from 'vitest';
import { MockBackend } from '../backend';
import { claim, login } from '../services/auth';
import { deleteFoodLog, logFood, restaurantRecommendations } from '../services/life';
import {
  acceptInvite,
  createInvite,
  createParty,
  getParty,
  groupRecommendations,
  listContributions,
  proposeContribution,
  revokeInvite,
  safetySummary,
} from '../services/party';
import { applyStatement, preferenceDetail, tasteProfile } from '../services/profile';
import { createRecipe, homeFeed, recipeDetail, search } from '../services/recipes';
import { HttpError } from '../errors';

let b: MockBackend;
const NOW = new Date('2026-10-03T12:00:00Z');

beforeEach(() => {
  b = new MockBackend({ now: () => NOW });
});

const status = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof HttpError ? `${e.status} ${e.code}` : String(e);
  }
  return 'ok';
};

describe('seed', () => {
  it("parses Alex's statement into a tree-nut allergy and taste preferences", () => {
    const profile = tasteProfile(b, 'usr_alex');
    expect(profile.constraints.map((c) => c.key)).toEqual(['tree_nut']);
    expect(profile.preferences.find((p) => p.key === 'cilantro')).toMatchObject({ explicit: true });
    expect(profile.preferences.find((p) => p.key === 'cilantro')?.value).toBeLessThan(-0.5);
  });
});

describe('recommendations', () => {
  it('never recommends a conflicting recipe on Home', () => {
    const items = homeFeed(b, 'usr_alex').sections.flatMap((s) => s.items);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.safety.status !== 'conflict')).toBe(true);
    // Pesto (pine nuts) and butter chicken (cashews) are out for a tree-nut allergy.
    expect(items.map((i) => i.recipe.id)).not.toContain('pesto-pasta');
  });

  it('search can hide conflicts and reports how many were hidden', () => {
    const r = search(b, 'usr_alex', { q: 'pasta', tags: [], maxTime: null, hideConflicts: true });
    expect(r.results.every((x) => x.safety.status !== 'conflict')).toBe(true);
    expect(r.hiddenConflicts).toBeGreaterThan(0);
  });

  it('explains every score with weighted components', () => {
    const detail = recipeDetail(b, 'usr_alex', 'thai-basil-chicken');
    const keys = detail.score.components.map((c) => c.key);
    expect(keys).toEqual(expect.arrayContaining(['taste', 'popularity', 'pantry', 'freshness']));
    const sum = detail.score.components.reduce((s, c) => s + c.contribution, 0);
    expect(detail.score.total).toBeCloseTo(Math.max(-1, Math.min(1, sum)), 2);
  });

  it('penalises an explicit dislike solo but does not hide it', () => {
    const r = search(b, 'usr_alex', { q: 'chana', tags: [], maxTime: null, hideConflicts: false });
    const chana = r.results.find((x) => x.recipe.id === 'chana-masala');
    expect(chana?.score.components.find((c) => c.key === 'explicit_dislike')).toBeDefined();
  });

  it('runs restaurant dishes through the same tri-state engine', () => {
    const recs = restaurantRecommendations(b, 'usr_alex');
    const dishes = recs.flatMap((r) => r.dishes);
    // Massaman paste isn't in the verified data, so that dish can't be "safe".
    expect(dishes.find((d) => d.dish.name === 'Massaman Curry')?.safety.status).toBe('unverified');
    expect(dishes.find((d) => d.dish.name === 'Pesto Trofie')?.safety.status).toBe('conflict');
  });
});

describe('preference evidence', () => {
  it('learns from a logged restaurant meal and recomputes when it is removed', () => {
    const before = tasteProfile(b, 'usr_jordan').preferences.find((p) => p.key === 'eggplant');
    expect(before).toBeUndefined();
    const log = logFood(b, 'usr_jordan', {
      kind: 'restaurant',
      dishName: 'Baba ganoush',
      recipeId: null,
      restaurantName: 'Green Fork',
      ingredients: ['eggplant', 'tahini', 'lemon'],
      rating: 'liked',
      notes: '',
      eatenOn: '2026-10-02',
    });
    const learned = tasteProfile(b, 'usr_jordan').preferences.find((p) => p.key === 'eggplant');
    expect(learned?.value).toBeGreaterThan(0);
    expect(
      preferenceDetail(b, 'usr_jordan', 'ingredient.eggplant').evidence[0]?.description,
    ).toContain('Baba ganoush');

    deleteFoodLog(b, 'usr_jordan', log.id);
    expect(
      tasteProfile(b, 'usr_jordan').preferences.find((p) => p.key === 'eggplant'),
    ).toBeUndefined();
  });
});

describe('Meal Party', () => {
  it('merges every member constraint into the host safety summary, regardless of taste sharing', () => {
    const summary = safetySummary(b, 'pty_friday', 'usr_alex');
    const labels = summary.exclusions.map((e) => e.key);
    expect(labels).toEqual(
      expect.arrayContaining(['tree_nut', 'shellfish', 'vegetarian', 'dairy_free']),
    );
  });

  it('hides parties from non-members (IDOR) with a 404', () => {
    expect(status(() => getParty(b, 'pty_friday', 'usr_lena'))).toBe('404 not_found');
  });

  it('checks potluck dishes against every other member', () => {
    const pesto = listContributions(b, 'pty_friday', 'usr_alex').find(
      (c) => c.dishName === 'Basil Pesto Pasta',
    );
    expect(pesto?.safety.status).toBe('conflict');
    // Tree nuts hit Alex, parmesan hits Chris (dairy-free); vegetarian Jordan is fine.
    expect([...new Set(pesto?.safety.conflicts.map((c) => c.memberName))].sort()).toEqual([
      'Alex Rivera',
      'Chris',
    ]);
  });

  it('requires ingredients for free-text potluck dishes', () => {
    expect(
      status(() =>
        proposeContribution(b, 'pty_friday', 'usr_jordan', {
          dishName: 'Mystery',
          recipeId: null,
          ingredients: [],
          course: 'side',
        }),
      ),
    ).toBe('400 bad_request');
  });

  it('excludes recipes that conflict with any member', () => {
    const recs = groupRecommendations(b, 'pty_friday', 'usr_alex');
    expect(recs.results.every((r) => r.safety.status !== 'conflict')).toBe(true);
    expect(recs.excludedCount).toBeGreaterThan(0);
  });

  it('diagnoses an impossible group instead of returning an empty list', () => {
    const p = createParty(b, 'usr_alex', {
      name: 'Impossible dinner',
      date: '2026-10-10',
      description: '',
    });
    applyStatement(
      b,
      'usr_alex',
      "I'm vegan. I'm allergic to soy, gluten, sesame and peanuts. I'm allergic to fish.",
    );
    const recs = groupRecommendations(b, p.id, 'usr_alex');
    if (recs.results.length === 0) {
      expect(recs.diagnosis?.blockers.length).toBeGreaterThan(0);
      expect(recs.diagnosis?.suggestion).toMatch(/potluck/);
    } else {
      expect(recs.diagnosis).toBeNull();
    }
  });
});

describe('invites and lite accounts', () => {
  it('creates a lite account on accept and applies the dietary note', () => {
    const r = acceptInvite(
      b,
      'friday-group',
      null,
      { name: 'Dana', dietaryNote: "I'm allergic to sesame" },
      'device-dana',
    );
    expect(r.createdLiteAccount).toBe(true);
    expect(r.user.kind).toBe('lite');
    expect(tasteProfile(b, r.userId).constraints.map((c) => c.key)).toEqual(['sesame']);
    expect(safetySummary(b, 'pty_friday', 'usr_alex').exclusions.map((e) => e.key)).toContain(
      'sesame',
    );
  });

  it('consumes a single-use link atomically: the second accept fails', () => {
    const first = acceptInvite(b, 'friday-lena', null, { name: 'Lena O' }, 'device-1');
    expect(first.createdLiteAccount).toBe(true);
    expect(
      status(() => acceptInvite(b, 'friday-lena', null, { name: 'Someone else' }, 'device-2')),
    ).toBe('410 invite_exhausted');
  });

  it('revoking one link leaves the others working', () => {
    const p = createParty(b, 'usr_alex', {
      name: 'Two links',
      date: '2026-10-10',
      description: '',
    });
    const a = createInvite(b, p.id, 'usr_alex', { label: 'A', maxUses: null });
    const c = createInvite(b, p.id, 'usr_alex', { label: 'B', maxUses: null });
    revokeInvite(b, p.id, 'usr_alex', a.id);
    expect(status(() => acceptInvite(b, a.token, null, { name: 'X' }, 'dx'))).toBe(
      '410 invite_revoked',
    );
    expect(acceptInvite(b, c.token, null, { name: 'Y' }, 'dy').createdLiteAccount).toBe(true);
  });

  it('recognises the same device rejoining through a second link instead of duplicating', () => {
    const r = acceptInvite(b, 'friday-group', null, { name: 'Chris' }, 'seed-device-chris');
    expect(r).toMatchObject({ userId: 'usr_chris', createdLiteAccount: false });
  });

  it('flags, but does not block, a likely duplicate from another device', () => {
    const r = acceptInvite(b, 'friday-group', null, { name: 'chris' }, 'new-phone');
    expect(r.createdLiteAccount).toBe(true);
    expect(r.possibleDuplicateOf).toEqual({ userId: 'usr_chris', name: 'Chris' });
  });

  it('claims a lite account in place, keeping history and memberships', () => {
    const user = claim(b, 'usr_chris', { email: 'chris@example.org', password: 'longenough' });
    expect(user).toMatchObject({ id: 'usr_chris', kind: 'full' });
    expect(
      getParty(b, 'pty_friday', 'usr_chris').members.some((m) => m.userId === 'usr_chris'),
    ).toBe(true);
    expect(tasteProfile(b, 'usr_chris').constraints.map((c) => c.key)).toEqual(['dairy_free']);
  });
});

describe('auth', () => {
  it('rate-limits repeated failed logins', () => {
    for (let i = 0; i < 5; i++) {
      expect(status(() => login(b, { email: 'alex@tastepilot.dev', password: 'wrong' }))).toBe(
        '401 invalid_credentials',
      );
    }
    expect(status(() => login(b, { email: 'alex@tastepilot.dev', password: 'tastepilot' }))).toBe(
      '429 rate_limited',
    );
  });
});

describe('authored recipes', () => {
  it("keeps someone else's unpublished draft invisible (404, not 403)", () => {
    const draft = createRecipe(
      b,
      'usr_jordan',
      {
        title: 'Secret soup',
        description: '',
        cuisine: 'french',
        timeMinutes: 20,
        servings: 2,
        tags: [],
        ingredients: ['onion'],
        steps: ['Cook'],
      },
      'community',
    );
    expect(status(() => recipeDetail(b, 'usr_alex', draft.recipe.id))).toBe('404 not_found');
  });
});
