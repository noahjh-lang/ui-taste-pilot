import { z } from 'zod';
import { idSchema, isoDateSchema, isoDateTimeSchema } from './common';
import { rankedRecipeSchema } from './recipes';
import { hardConstraintSchema, safetyStatusSchema } from './safety';
import { accountKindSchema } from './users';

export const partyMemberSchema = z.object({
  userId: idSchema,
  name: z.string(),
  kind: accountKindSchema,
  role: z.enum(['host', 'member']),
  avatarColor: z.string(),
  joinedAt: isoDateTimeSchema,
  /** Hard constraints are always visible to the group: they drive exclusion. */
  constraints: z.array(hardConstraintSchema),
  /** Taste data is shared only when the member allows it. */
  sharesTaste: z.boolean(),
});
export type PartyMember = z.infer<typeof partyMemberSchema>;

export const partySummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  date: isoDateSchema,
  description: z.string(),
  hostName: z.string(),
  memberCount: z.number().int(),
  myRole: z.enum(['host', 'member']),
});
export type PartySummary = z.infer<typeof partySummarySchema>;

export const partySchema = partySummarySchema.extend({
  hostId: idSchema,
  members: z.array(partyMemberSchema),
  updatedAt: isoDateTimeSchema,
});
export type Party = z.infer<typeof partySchema>;

export const createPartyInputSchema = z.object({
  name: z.string().trim().min(2, 'Name your party').max(80),
  date: isoDateSchema,
  description: z.string().trim().max(300),
});
export type CreatePartyInput = z.infer<typeof createPartyInputSchema>;

/** The merged, party-wide exclusion set, traceable to each member. */
export const partySafetySummarySchema = z.object({
  partyId: idSchema,
  exclusions: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      kind: z.enum(['allergy', 'diet']),
      members: z.array(z.object({ userId: idSchema, name: z.string() })),
    }),
  ),
  membersWithoutConstraints: z.array(z.object({ userId: idSchema, name: z.string() })),
  updatedAt: isoDateTimeSchema,
});
export type PartySafetySummary = z.infer<typeof partySafetySummarySchema>;

export const inviteLinkSchema = z.object({
  id: idSchema,
  token: z.string(),
  label: z.string(),
  maxUses: z.number().int().nullable(),
  uses: z.number().int(),
  createdAt: isoDateTimeSchema,
  revokedAt: isoDateTimeSchema.nullable(),
});
export type InviteLink = z.infer<typeof inviteLinkSchema>;

export const createInviteInputSchema = z.object({
  label: z.string().trim().min(1, 'Label the link').max(40),
  maxUses: z.number().int().min(1).max(100).nullable(),
});
export type CreateInviteInput = z.infer<typeof createInviteInputSchema>;

/** What an invitee sees before joining. No member data is exposed. */
export const invitePreviewSchema = z.object({
  token: z.string(),
  partyName: z.string(),
  partyDate: isoDateSchema,
  hostName: z.string(),
  memberCount: z.number().int(),
  status: z.enum(['valid', 'revoked', 'exhausted']),
  alreadyMember: z.boolean(),
});
export type InvitePreview = z.infer<typeof invitePreviewSchema>;

export const acceptInviteInputSchema = z.object({
  /** Required when joining as a guest (no session). */
  name: z.string().trim().min(1, 'Tell the host your name').max(60).optional(),
  /** Free text such as "allergic to shellfish", parsed by the server. */
  dietaryNote: z.string().trim().max(300).optional(),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteInputSchema>;

export const acceptInviteResultSchema = z.object({
  partyId: idSchema,
  userId: idSchema,
  createdLiteAccount: z.boolean(),
  /** Soft, non-blocking hint: this guest may already be in the party. */
  possibleDuplicateOf: z.object({ userId: idSchema, name: z.string() }).nullable(),
});
export type AcceptInviteResult = z.infer<typeof acceptInviteResultSchema>;

export const contributionSafetySchema = z.object({
  status: safetyStatusSchema,
  conflicts: z.array(
    z.object({
      memberName: z.string(),
      constraintLabel: z.string(),
      ingredient: z.string(),
    }),
  ),
  unverifiedIngredients: z.array(z.string()),
});

export const potluckContributionSchema = z.object({
  id: idSchema,
  partyId: idSchema,
  memberId: idSchema,
  memberName: z.string(),
  dishName: z.string(),
  recipeId: idSchema.nullable(),
  ingredients: z.array(z.string()),
  course: z.enum(['main', 'side', 'dessert', 'drink', 'other']),
  status: z.enum(['proposed', 'claimed', 'brought']),
  safety: contributionSafetySchema,
  createdAt: isoDateTimeSchema,
});
export type PotluckContribution = z.infer<typeof potluckContributionSchema>;

export const proposeContributionInputSchema = z.object({
  dishName: z.string().trim().min(2, 'Name the dish').max(80),
  recipeId: idSchema.nullable(),
  ingredients: z.array(z.string().trim().min(1)),
  course: z.enum(['main', 'side', 'dessert', 'drink', 'other']),
});
export type ProposeContributionInput = z.infer<typeof proposeContributionInputSchema>;

export const groupRecommendationsSchema = z.object({
  results: z.array(rankedRecipeSchema),
  /** Present when nothing satisfies everyone: why, instead of an empty list. */
  diagnosis: z
    .object({
      message: z.string(),
      blockers: z.array(
        z.object({
          label: z.string(),
          memberNames: z.array(z.string()),
          excludedCount: z.number().int(),
        }),
      ),
      suggestion: z.string(),
    })
    .nullable(),
  excludedCount: z.number().int(),
});
export type GroupRecommendations = z.infer<typeof groupRecommendationsSchema>;
