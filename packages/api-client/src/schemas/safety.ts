import { SAFETY_STATUSES } from '@tastepilot/shared';
import { z } from 'zod';
import { idSchema, isoDateTimeSchema } from './common';

export const safetyStatusSchema = z.enum(SAFETY_STATUSES);

export const constraintKindSchema = z.enum(['allergy', 'diet']);
export type ConstraintKind = z.infer<typeof constraintKindSchema>;

/** An allergy or dietary restriction: excludes outright, never just down-ranks. */
export const hardConstraintSchema = z.object({
  id: idSchema,
  kind: constraintKindSchema,
  /** Canonical key, e.g. `tree_nut`, `peanut`, `vegetarian`. */
  key: z.string(),
  label: z.string(),
  source: z.enum(['structured', 'statement']),
  /** The user's own words, when it came from a natural-language statement. */
  sourceText: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type HardConstraint = z.infer<typeof hardConstraintSchema>;

/** Why an item is not `safe`. Every reason is traceable to a constraint. */
export const safetyReasonSchema = z.object({
  kind: z.enum(['conflict', 'unmapped_ingredient']),
  /** The ingredient as written on the recipe or menu. */
  ingredient: z.string(),
  /** Constraint that was hit (`conflict` only). */
  constraintKey: z.string().nullable(),
  constraintLabel: z.string().nullable(),
  /** Whose constraint it is, for Party / household checks. */
  memberName: z.string().nullable(),
});
export type SafetyReason = z.infer<typeof safetyReasonSchema>;

export const safetyResultSchema = z.object({
  status: safetyStatusSchema,
  reasons: z.array(safetyReasonSchema),
  checkedAt: isoDateTimeSchema,
});
export type SafetyResult = z.infer<typeof safetyResultSchema>;

export const constraintOptionSchema = z.object({
  kind: constraintKindSchema,
  key: z.string(),
  label: z.string(),
});
export type ConstraintOption = z.infer<typeof constraintOptionSchema>;
