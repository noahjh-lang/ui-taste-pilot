import type {
  Calendar,
  CalendarEntry,
  FoodLog,
  PantryItem,
  RankedDish,
  RestaurantRecommendation,
} from '@tastepilot/api-client';
import type { MockBackend } from '../backend';
import type { CalendarRow, FoodLogRow, PantryRow } from '../db';
import { RATING_SIGNAL, prefLabel } from '../engine/preferences';
import { scoreItem } from '../engine/ranking';
import { evaluateSafety } from '../engine/safety';
import { matchIngredient, structureIngredients } from '../engine/structure';
import { badRequest, forbidden, notFound } from '../errors';
import { newId } from '../ids';
import { addEvidence, constraintRefs } from './profile';
import { evidenceKeys, rankingContext, recipeFor } from './recipes';
import { userById } from './users';

// --- Food history --------------------------------------------------------------

function toFoodLog(b: MockBackend, row: FoodLogRow): FoodLog {
  const affected = b.db.evidence
    .filter((e) => e.sourceType === 'food_log' && e.sourceId === row.id)
    .map((e) => prefLabel(e.prefType, e.key));
  return {
    id: row.id,
    kind: row.kind,
    dishName: row.dishName,
    recipeId: row.recipeId,
    restaurantName: row.restaurantName,
    ingredients: structureIngredients(row.ingredients),
    rating: row.rating,
    notes: row.notes,
    eatenOn: row.eatenOn,
    createdAt: row.createdAt,
    affectedPreferences: [...new Set(affected)],
  };
}

export function listFoodLogs(b: MockBackend, userId: string) {
  return b.db.foodLogs
    .filter((l) => l.userId === userId)
    .sort((a, c) => c.eatenOn.localeCompare(a.eatenOn) || c.createdAt.localeCompare(a.createdAt))
    .map((l) => toFoodLog(b, l));
}

/** Both home and restaurant logs feed the same preference-evidence pipeline. */
export function logFood(
  b: MockBackend,
  userId: string,
  input: Omit<FoodLogRow, 'id' | 'userId' | 'createdAt'>,
  at?: string,
) {
  let ingredients = input.ingredients;
  let cuisine: string | null = null;
  let flavors: string[] = [];
  if (input.recipeId) {
    const recipe = recipeFor(b, userId, input.recipeId);
    ingredients = recipe.ingredients;
    cuisine = recipe.cuisine;
    flavors = recipe.flavors;
  }
  if (!input.recipeId && ingredients.length === 0 && input.kind === 'home') {
    throw badRequest('Add the main ingredients, or pick a recipe, so we can learn from it.');
  }
  const createdAt = at ?? b.nowIso();
  const row: FoodLogRow = { ...input, ingredients, id: newId('log'), userId, createdAt };
  b.db.foodLogs.push(row);

  const verb = input.kind === 'home' ? 'Cooked' : 'Ate';
  const where = input.restaurantName ? ` at ${input.restaurantName}` : '';
  addEvidence(
    b,
    evidenceKeys(ingredients, cuisine, flavors).map((k) => ({
      userId,
      ...k,
      kind: input.kind === 'home' ? ('cooked' as const) : ('ate_out' as const),
      signal: RATING_SIGNAL[input.rating],
      explicit: false,
      description: `${verb} ${input.dishName}${where} (${input.rating})`,
      sourceType: 'food_log' as const,
      sourceId: row.id,
      createdAt,
    })),
  );
  return toFoodLog(b, row);
}

/** Removing a log removes its evidence; preferences recompute from what's left. */
export function deleteFoodLog(b: MockBackend, userId: string, id: string) {
  const row = b.db.foodLogs.find((l) => l.id === id && l.userId === userId);
  if (!row) throw notFound('Log entry not found');
  b.db.foodLogs = b.db.foodLogs.filter((l) => l.id !== id);
  b.db.evidence = b.db.evidence.filter((e) => !(e.sourceType === 'food_log' && e.sourceId === id));
}

// --- Pantry ----------------------------------------------------------------------

const toPantryItem = (row: PantryRow): PantryItem => ({
  id: row.id,
  name: row.name,
  canonical: matchIngredient(row.name)?.key ?? null,
  quantity: row.quantity,
  addedAt: row.addedAt,
});

export const listPantry = (b: MockBackend, userId: string) =>
  b.db.pantry
    .filter((p) => p.userId === userId)
    .sort((a, c) => a.name.localeCompare(c.name))
    .map(toPantryItem);

export function addPantryItem(
  b: MockBackend,
  userId: string,
  input: { name: string; quantity: string },
) {
  const row: PantryRow = { id: newId('pan'), userId, ...input, addedAt: b.nowIso() };
  b.db.pantry.push(row);
  return toPantryItem(row);
}

export function removePantryItem(b: MockBackend, userId: string, id: string) {
  const before = b.db.pantry.length;
  b.db.pantry = b.db.pantry.filter((p) => !(p.id === id && p.userId === userId));
  if (b.db.pantry.length === before) throw notFound('Pantry item not found');
}

// --- Restaurants -----------------------------------------------------------------

/**
 * Restaurant dishes go through the same tri-state safety engine and the same
 * ranking function as recipes: no tag-based shortcut, no default-safe dishes.
 */
export function restaurantRecommendations(
  b: MockBackend,
  userId: string,
): RestaurantRecommendation[] {
  const ctx = rankingContext(b, userId);
  const constraints = constraintRefs(b, [userId], { named: false });
  const now = b.nowIso();
  return b.db.restaurants
    .map((r) => {
      const dishes: RankedDish[] = r.dishes
        .map((d) => {
          const ingredients = structureIngredients(d.ingredients);
          return {
            dish: {
              id: d.id,
              name: d.name,
              description: d.description,
              price: d.price,
              ingredients,
            },
            safety: evaluateSafety(ingredients, constraints, now),
            score: scoreItem(
              { id: d.id, ingredients, cuisine: r.cuisine, flavors: [], rating: null },
              ctx,
            ),
          };
        })
        .sort((a, c) => c.score.total - a.score.total);
      const eligible = dishes.filter((d) => d.safety.status !== 'conflict');
      const top = eligible.slice(0, 3);
      return {
        restaurant: {
          id: r.id,
          name: r.name,
          cuisine: r.cuisine,
          neighborhood: r.neighborhood,
          priceLevel: r.priceLevel,
          emoji: r.emoji,
        },
        matchScore: top.length
          ? Math.round((top.reduce((s, d) => s + d.score.total, 0) / top.length) * 1000) / 1000
          : -1,
        // Conflicting dishes are listed last so nothing is hidden, but never recommended.
        dishes: [...eligible, ...dishes.filter((d) => d.safety.status === 'conflict')],
        safeDishCount: dishes.filter((d) => d.safety.status === 'safe').length,
      };
    })
    .sort((a, c) => c.matchScore - a.matchScore);
}

// --- Household calendar ------------------------------------------------------------

function household(b: MockBackend, userId: string) {
  const user = userById(b, userId);
  const h = user.householdId ? b.db.households.find((x) => x.id === user.householdId) : undefined;
  if (!h) throw forbidden('Join or create a household to use the family calendar.');
  return h;
}

function toEntry(
  b: MockBackend,
  row: CalendarRow,
  memberIds: string[],
  viewerId: string,
): CalendarEntry {
  const recipe = recipeFor(b, viewerId, row.recipeId);
  return {
    id: row.id,
    date: row.date,
    slot: row.slot,
    recipeId: recipe.id,
    recipeTitle: recipe.title,
    recipeEmoji: recipe.emoji,
    addedByName: userById(b, row.addedBy).name,
    // Checked against everyone in the household, so the plan is safe for all.
    safety: evaluateSafety(
      structureIngredients(recipe.ingredients),
      constraintRefs(b, memberIds, { named: true }),
      b.nowIso(),
    ),
  };
}

export function calendar(b: MockBackend, userId: string, start: string, days: number): Calendar {
  const h = household(b, userId);
  const end = new Date(`${start}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + Math.min(Math.max(days, 1), 42));
  const endIso = end.toISOString().slice(0, 10);
  return {
    householdName: h.name,
    members: h.memberIds.map((id) => {
      const u = userById(b, id);
      return { userId: u.id, name: u.name, avatarColor: u.avatarColor };
    }),
    entries: b.db.calendar
      .filter((c) => c.householdId === h.id && c.date >= start && c.date < endIso)
      .sort((a, c) => a.date.localeCompare(c.date))
      .flatMap((c) => {
        try {
          return [toEntry(b, c, h.memberIds, userId)];
        } catch {
          return [];
        }
      }),
  };
}

export function addCalendarEntry(
  b: MockBackend,
  userId: string,
  input: { date: string; slot: CalendarRow['slot']; recipeId: string },
) {
  const h = household(b, userId);
  recipeFor(b, userId, input.recipeId);
  const row: CalendarRow = {
    id: newId('cal'),
    householdId: h.id,
    ...input,
    addedBy: userId,
    createdAt: b.nowIso(),
  };
  b.db.calendar.push(row);
  return toEntry(b, row, h.memberIds, userId);
}

export function removeCalendarEntry(b: MockBackend, userId: string, id: string) {
  const h = household(b, userId);
  const before = b.db.calendar.length;
  b.db.calendar = b.db.calendar.filter((c) => !(c.id === id && c.householdId === h.id));
  if (b.db.calendar.length === before) throw notFound('Calendar entry not found');
}
