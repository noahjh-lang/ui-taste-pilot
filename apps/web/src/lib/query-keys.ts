import type { QueryClient } from '@tanstack/react-query';

/**
 * Query keys, namespaced by domain so invalidation is precise. Shared here
 * (not inside features) because mutations in one feature invalidate data
 * owned by another, e.g. logging a meal changes recommendations.
 */
export const queryKeys = {
  session: ['session'] as const,
  profile: ['profile'] as const,
  preference: (id: string) => ['profile', 'preference', id] as const,
  constraintOptions: ['constraint-options'] as const,
  recipes: ['recipes'] as const,
  homeFeed: ['recipes', 'home'] as const,
  discover: ['recipes', 'discover'] as const,
  search: (params: object) => ['recipes', 'search', params] as const,
  tags: ['recipes', 'tags'] as const,
  myRecipes: ['recipes', 'mine'] as const,
  recipe: (id: string) => ['recipe', id] as const,
  recipePosts: (id: string) => ['recipe', id, 'posts'] as const,
  publicRecipe: (id: string) => ['public-recipe', id] as const,
  /** Safety is per user: switching accounts can never reuse another user's result. */
  safety: ['safety'] as const,
  recipeSafety: (userId: string, recipeId: string) => ['safety', userId, recipeId] as const,
  parties: ['parties'] as const,
  party: (id: string) => ['party', id] as const,
  partySafety: (id: string) => ['party', id, 'safety-summary'] as const,
  partyInvites: (id: string) => ['party', id, 'invites'] as const,
  partyContributions: (id: string) => ['party', id, 'contributions'] as const,
  partyRecommendations: (id: string) => ['party', id, 'recommendations'] as const,
  invite: (token: string) => ['invite', token] as const,
  foodLogs: ['food-logs'] as const,
  pantry: ['pantry'] as const,
  restaurants: ['restaurants'] as const,
  calendar: (start: string) => ['calendar', start] as const,
  calendarAll: ['calendar'] as const,
  cookbook: (filter: string) => ['cookbook', filter] as const,
  user: (handle: string) => ['user', handle] as const,
  userRecipes: (handle: string) => ['user', handle, 'recipes'] as const,
  mentions: ['mentions'] as const,
};

/**
 * Everything derived from a user's taste profile or constraints. Called after
 * any change to preferences, constraints, food history or pantry.
 */
export function invalidateTasteDependents(qc: QueryClient) {
  return Promise.all(
    [
      queryKeys.profile,
      queryKeys.recipes,
      ['recipe'],
      queryKeys.safety,
      ['party'],
      queryKeys.restaurants,
      queryKeys.calendarAll,
    ].map((queryKey) => qc.invalidateQueries({ queryKey })),
  );
}
