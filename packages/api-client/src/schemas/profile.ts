import { z } from 'zod';
import { idSchema, isoDateTimeSchema } from './common';
import { constraintKindSchema, hardConstraintSchema } from './safety';

export const prefTypeSchema = z.enum(['ingredient', 'flavor', 'cuisine']);
export type PrefType = z.infer<typeof prefTypeSchema>;

export const evidenceSchema = z.object({
  id: idSchema,
  kind: z.enum(['statement', 'cooked', 'ate_out', 'feedback']),
  /** Signed signal strength applied, -1..1. */
  signal: z.number(),
  /** Human-readable description: "Cooked Thai Basil Chicken (liked it)". */
  description: z.string(),
  /** What produced it, so it can be traced and removed. */
  sourceType: z.enum(['statement', 'food_log', 'recipe_feedback']),
  sourceId: idSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type Evidence = z.infer<typeof evidenceSchema>;

export const preferenceSchema = z.object({
  id: idSchema,
  prefType: prefTypeSchema,
  key: z.string(),
  label: z.string(),
  /** -1 (strong dislike) .. 1 (strong like). */
  value: z.number(),
  /** 0..1 */
  confidence: z.number(),
  evidenceCount: z.number().int(),
  explicit: z.boolean(),
  updatedAt: isoDateTimeSchema,
});
export type Preference = z.infer<typeof preferenceSchema>;

export const preferenceDetailSchema = preferenceSchema.extend({
  evidence: z.array(evidenceSchema),
});
export type PreferenceDetail = z.infer<typeof preferenceDetailSchema>;

export const tasteProfileSchema = z.object({
  preferences: z.array(preferenceSchema),
  constraints: z.array(hardConstraintSchema),
  stats: z.object({
    explicitCount: z.number().int(),
    inferredCount: z.number().int(),
    evidenceCount: z.number().int(),
  }),
});
export type TasteProfile = z.infer<typeof tasteProfileSchema>;

/** Output of the fixed, auditable natural-language rule set. */
export const statementParseSchema = z.object({
  text: z.string(),
  constraints: z.array(
    z.object({
      kind: constraintKindSchema,
      key: z.string(),
      label: z.string(),
      matchedText: z.string(),
      rule: z.string(),
    }),
  ),
  preferences: z.array(
    z.object({
      prefType: prefTypeSchema,
      key: z.string(),
      label: z.string(),
      sentiment: z.enum(['like', 'dislike']),
      matchedText: z.string(),
      rule: z.string(),
    }),
  ),
  /** Phrases the rules could not interpret, with a hint when ambiguous. */
  unrecognized: z.array(z.object({ text: z.string(), hint: z.string().nullable() })),
});
export type StatementParse = z.infer<typeof statementParseSchema>;

export const statementInputSchema = z.object({
  text: z.string().trim().min(3, 'Say a little more').max(500),
});

export const constraintInputSchema = z.object({
  kind: constraintKindSchema,
  key: z.string().min(1),
});

export const preferenceInputSchema = z.object({
  prefType: prefTypeSchema,
  key: z.string().min(1),
  sentiment: z.enum(['like', 'dislike']),
});
