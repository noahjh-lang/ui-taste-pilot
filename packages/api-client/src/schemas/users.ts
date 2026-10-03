import { z } from 'zod';
import { idSchema, isoDateTimeSchema } from './common';

export const accountKindSchema = z.enum(['full', 'lite']);
export type AccountKind = z.infer<typeof accountKindSchema>;

export const userSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  handle: z.string().nullable(),
  kind: accountKindSchema,
  avatarColor: z.string(),
});
export type UserSummary = z.infer<typeof userSummarySchema>;

export const meSchema = userSummarySchema.extend({
  email: z.string().nullable(),
  householdId: idSchema.nullable(),
  /** Lite accounts only: the Party the account was created for. */
  liteForPartyId: idSchema.nullable(),
  shareTasteWithParties: z.boolean(),
  createdAt: isoDateTimeSchema,
});
export type Me = z.infer<typeof meSchema>;

export const sessionSchema = z.object({
  user: meSchema.nullable(),
});
export type Session = z.infer<typeof sessionSchema>;

export const signupInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(60),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
});
export type SignupInput = z.infer<typeof signupInputSchema>;

export const loginInputSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const claimInputSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
});
export type ClaimInput = z.infer<typeof claimInputSchema>;

export const publicProfileSchema = userSummarySchema.extend({
  bio: z.string(),
  followers: z.number().int(),
  following: z.number().int(),
  isFollowing: z.boolean(),
  isMe: z.boolean(),
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;

export const accountSettingsInputSchema = z.object({
  shareTasteWithParties: z.boolean(),
});
