import { z } from 'zod';
import { idSchema, isoDateTimeSchema } from './common';
import { recipeSummarySchema } from './recipes';
import { userSummarySchema } from './users';

export const postKindSchema = z.enum(['review', 'tip', 'comment']);

/**
 * A review, tip, or comment. Informational only: community content never
 * affects a recipe's safety result.
 */
export const recipePostSchema = z.object({
  id: idSchema,
  recipeId: idSchema,
  kind: postKindSchema,
  author: userSummarySchema,
  rating: z.number().int().min(1).max(5).nullable(),
  body: z.string(),
  /** Photo as a data URL (stub) or CDN URL (real backend). */
  photoUrl: z.string().nullable(),
  mentions: z.array(z.object({ handle: z.string(), userId: idSchema })),
  createdAt: isoDateTimeSchema,
});
export type RecipePost = z.infer<typeof recipePostSchema>;

export const recipePostInputSchema = z.object({
  kind: postKindSchema,
  rating: z.number().int().min(1).max(5).nullable(),
  body: z.string().trim().min(2, 'Write a little more').max(1000),
  photoUrl: z.string().max(2_000_000).nullable(),
});
export type RecipePostInput = z.infer<typeof recipePostInputSchema>;

export const cookbookFeedSchema = z.object({
  recipes: z.array(recipeSummarySchema),
});

export const mentionSchema = z.object({
  post: recipePostSchema,
  recipeTitle: z.string(),
});
export type Mention = z.infer<typeof mentionSchema>;
