// Query keys are namespaced by domain so invalidation stays precise.
export const safetyKeys = {
  all: ['safety'] as const,
  recipe: (recipeId: string) => [...safetyKeys.all, 'recipe', recipeId] as const,
};
