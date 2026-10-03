import { z } from 'zod';
import { idSchema, isoDateTimeSchema } from './common';
import { safetyResultSchema } from './safety';
import { userSummarySchema } from './users';

/** An ingredient after server-side structuring against verified data. */
export const ingredientSchema = z.object({
  text: z.string(),
  /** Canonical ingredient key, or null when it isn't in the verified dataset. */
  canonical: z.string().nullable(),
  allergens: z.array(z.string()),
});
export type Ingredient = z.infer<typeof ingredientSchema>;

export const recipeSourceSchema = z.enum(['catalog', 'community', 'ai_generated']);

export const recipeSummarySchema = z.object({
  id: idSchema,
  title: z.string(),
  description: z.string(),
  cuisine: z.string(),
  tags: z.array(z.string()),
  timeMinutes: z.number().int(),
  emoji: z.string(),
  color: z.string(),
  source: recipeSourceSchema,
  author: userSummarySchema.nullable(),
  rating: z.object({ average: z.number(), count: z.number().int() }),
  published: z.boolean(),
});
export type RecipeSummary = z.infer<typeof recipeSummarySchema>;

export const recipeSchema = recipeSummarySchema.extend({
  servings: z.number().int(),
  flavors: z.array(z.string()),
  ingredients: z.array(ingredientSchema),
  steps: z.array(z.string()),
  createdAt: isoDateTimeSchema,
});
export type Recipe = z.infer<typeof recipeSchema>;

/** One weighted component of the shared, explainable ranking score. */
export const scoreComponentSchema = z.object({
  key: z.string(),
  label: z.string(),
  weight: z.number(),
  /** Component value before weighting, -1..1. */
  value: z.number(),
  contribution: z.number(),
  explanation: z.string(),
});
export type ScoreComponent = z.infer<typeof scoreComponentSchema>;

export const scoreSchema = z.object({
  total: z.number(),
  components: z.array(scoreComponentSchema),
});
export type Score = z.infer<typeof scoreSchema>;

export const pantryMatchSchema = z.object({ have: z.number().int(), total: z.number().int() });

export const rankedRecipeSchema = z.object({
  recipe: recipeSummarySchema,
  safety: safetyResultSchema,
  score: scoreSchema,
  pantryMatch: pantryMatchSchema,
});
export type RankedRecipe = z.infer<typeof rankedRecipeSchema>;

export const recipeDetailSchema = z.object({
  recipe: recipeSchema,
  score: scoreSchema,
  pantryMatch: pantryMatchSchema,
  myFeedback: z.enum(['like', 'dislike']).nullable(),
  canEdit: z.boolean(),
});
export type RecipeDetail = z.infer<typeof recipeDetailSchema>;

export const searchResultsSchema = z.object({
  query: z.string(),
  results: z.array(rankedRecipeSchema),
  hiddenConflicts: z.number().int(),
});
export type SearchResults = z.infer<typeof searchResultsSchema>;

export const feedSchema = z.object({
  sections: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      subtitle: z.string(),
      items: z.array(rankedRecipeSchema),
    }),
  ),
});
export type Feed = z.infer<typeof feedSchema>;

export const recipeDraftSchema = z.object({
  title: z.string().trim().min(3, 'Give it a title').max(80),
  description: z.string().trim().max(300),
  cuisine: z.string().trim().min(1, 'Pick a cuisine'),
  timeMinutes: z.number().int().min(1).max(600),
  servings: z.number().int().min(1).max(24),
  tags: z.array(z.string()),
  ingredients: z.array(z.string().trim().min(1)).min(1, 'Add at least one ingredient'),
  steps: z.array(z.string().trim().min(1)).min(1, 'Add at least one step'),
});
export type RecipeDraft = z.infer<typeof recipeDraftSchema>;

export const generateInputSchema = z.object({
  prompt: z.string().trim().min(3, 'Describe what you want to cook').max(300),
  usePantry: z.boolean(),
});
export type GenerateInput = z.infer<typeof generateInputSchema>;

export const generatedDraftSchema = z.object({
  draft: recipeDraftSchema,
  notes: z.array(z.string()),
});
export type GeneratedDraft = z.infer<typeof generatedDraftSchema>;

export const feedbackInputSchema = z.object({
  feedback: z.enum(['like', 'dislike']).nullable(),
});

export { userSummarySchema };
