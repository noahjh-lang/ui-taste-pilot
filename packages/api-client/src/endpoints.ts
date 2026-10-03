import { z } from 'zod';
import type { ApiClient } from './client';
import * as s from './schemas';

const enc = encodeURIComponent;

/**
 * Every backend endpoint the web app uses, with its request and response
 * contract. Features call these through TanStack Query; nothing calls fetch
 * directly.
 */
export function createTastePilotApi(client: ApiClient) {
  const { request } = client;

  return {
    auth: {
      session: (signal?: AbortSignal) => request('/session', { schema: s.sessionSchema, signal }),
      signup: (input: s.SignupInput) =>
        request('/auth/signup', { method: 'POST', body: input, schema: s.sessionSchema }),
      login: (input: s.LoginInput) =>
        request('/auth/login', { method: 'POST', body: input, schema: s.sessionSchema }),
      logout: () => request('/auth/logout', { method: 'POST', schema: s.okSchema }),
      claim: (input: s.ClaimInput) =>
        request('/auth/claim', { method: 'POST', body: input, schema: s.sessionSchema }),
    },

    me: {
      updateSettings: (input: z.infer<typeof s.accountSettingsInputSchema>) =>
        request('/me/settings', { method: 'PATCH', body: input, schema: s.sessionSchema }),
      exportData: () => request('/me/export', { schema: z.record(z.string(), z.unknown()) }),
      deleteData: () => request('/me/data', { method: 'DELETE', schema: s.okSchema }),
      deleteAccount: () => request('/me', { method: 'DELETE', schema: s.okSchema }),
    },

    profile: {
      get: (signal?: AbortSignal) => request('/profile', { schema: s.tasteProfileSchema, signal }),
      preference: (id: string, signal?: AbortSignal) =>
        request(`/profile/preferences/${enc(id)}`, { schema: s.preferenceDetailSchema, signal }),
      parseStatement: (text: string) =>
        request('/profile/statements/parse', {
          method: 'POST',
          body: { text },
          schema: s.statementParseSchema,
        }),
      applyStatement: (text: string) =>
        request('/profile/statements', {
          method: 'POST',
          body: { text },
          schema: s.tasteProfileSchema,
        }),
      addConstraint: (input: z.infer<typeof s.constraintInputSchema>) =>
        request('/profile/constraints', {
          method: 'POST',
          body: input,
          schema: s.tasteProfileSchema,
        }),
      removeConstraint: (id: string) =>
        request(`/profile/constraints/${enc(id)}`, {
          method: 'DELETE',
          schema: s.tasteProfileSchema,
        }),
      setPreference: (input: z.infer<typeof s.preferenceInputSchema>) =>
        request('/profile/preferences', {
          method: 'POST',
          body: input,
          schema: s.tasteProfileSchema,
        }),
      removePreference: (id: string) =>
        request(`/profile/preferences/${enc(id)}`, {
          method: 'DELETE',
          schema: s.tasteProfileSchema,
        }),
      constraintOptions: (signal?: AbortSignal) =>
        request('/constraints/options', { schema: z.array(s.constraintOptionSchema), signal }),
    },

    recipes: {
      homeFeed: (signal?: AbortSignal) => request('/feed/home', { schema: s.feedSchema, signal }),
      discover: (signal?: AbortSignal) => request('/discover', { schema: s.feedSchema, signal }),
      search: (
        params: { q: string; tags?: string[]; maxTime?: number | null; hideConflicts?: boolean },
        signal?: AbortSignal,
      ) =>
        request('/search', {
          query: {
            q: params.q,
            tags: params.tags,
            maxTime: params.maxTime ?? undefined,
            hideConflicts: params.hideConflicts ? 'true' : undefined,
          },
          schema: s.searchResultsSchema,
          signal,
        }),
      tags: (signal?: AbortSignal) =>
        request('/recipes/tags', { schema: z.array(z.string()), signal }),
      get: (id: string, signal?: AbortSignal) =>
        request(`/recipes/${enc(id)}`, { schema: s.recipeDetailSchema, signal }),
      safety: (id: string, signal?: AbortSignal) =>
        request(`/recipes/${enc(id)}/safety`, { schema: s.safetyResultSchema, signal }),
      setFeedback: (id: string, feedback: 'like' | 'dislike' | null) =>
        request(`/recipes/${enc(id)}/feedback`, {
          method: 'PUT',
          body: { feedback },
          schema: s.okSchema,
        }),
      generate: (input: s.GenerateInput) =>
        request('/recipes/generate', {
          method: 'POST',
          body: input,
          schema: s.generatedDraftSchema,
        }),
      create: (draft: s.RecipeDraft, source: 'community' | 'ai_generated' = 'community') =>
        request('/recipes', {
          method: 'POST',
          body: { ...draft, source },
          schema: s.recipeDetailSchema,
        }),
      update: (id: string, draft: s.RecipeDraft) =>
        request(`/recipes/${enc(id)}`, {
          method: 'PUT',
          body: draft,
          schema: s.recipeDetailSchema,
        }),
      setPublished: (id: string, published: boolean) =>
        request(`/recipes/${enc(id)}/publish`, {
          method: 'POST',
          body: { published },
          schema: s.recipeDetailSchema,
        }),
      mine: (signal?: AbortSignal) =>
        request('/recipes/mine', { schema: z.array(s.recipeSummarySchema), signal }),
      publicGet: (id: string, signal?: AbortSignal) =>
        request(`/public/recipes/${enc(id)}`, { schema: s.recipeSchema, signal }),
    },

    community: {
      cookbook: (filter: 'all' | 'following' | 'mine', signal?: AbortSignal) =>
        request('/cookbook', { query: { filter }, schema: s.cookbookFeedSchema, signal }),
      posts: (recipeId: string, signal?: AbortSignal) =>
        request(`/recipes/${enc(recipeId)}/posts`, { schema: z.array(s.recipePostSchema), signal }),
      createPost: (recipeId: string, input: s.RecipePostInput) =>
        request(`/recipes/${enc(recipeId)}/posts`, {
          method: 'POST',
          body: input,
          schema: s.recipePostSchema,
        }),
      profile: (handle: string, signal?: AbortSignal) =>
        request(`/users/${enc(handle)}`, { schema: s.publicProfileSchema, signal }),
      userRecipes: (handle: string, signal?: AbortSignal) =>
        request(`/users/${enc(handle)}/recipes`, {
          schema: z.array(s.recipeSummarySchema),
          signal,
        }),
      follow: (handle: string) =>
        request(`/users/${enc(handle)}/follow`, { method: 'POST', schema: s.publicProfileSchema }),
      unfollow: (handle: string) =>
        request(`/users/${enc(handle)}/follow`, {
          method: 'DELETE',
          schema: s.publicProfileSchema,
        }),
      mentions: (signal?: AbortSignal) =>
        request('/mentions', { schema: z.array(s.mentionSchema), signal }),
    },

    parties: {
      list: (signal?: AbortSignal) =>
        request('/parties', { schema: z.array(s.partySummarySchema), signal }),
      create: (input: s.CreatePartyInput) =>
        request('/parties', { method: 'POST', body: input, schema: s.partySchema }),
      get: (id: string, signal?: AbortSignal) =>
        request(`/parties/${enc(id)}`, { schema: s.partySchema, signal }),
      safetySummary: (id: string, signal?: AbortSignal) =>
        request(`/parties/${enc(id)}/safety-summary`, {
          schema: s.partySafetySummarySchema,
          signal,
        }),
      invites: (id: string, signal?: AbortSignal) =>
        request(`/parties/${enc(id)}/invites`, { schema: z.array(s.inviteLinkSchema), signal }),
      createInvite: (id: string, input: s.CreateInviteInput) =>
        request(`/parties/${enc(id)}/invites`, {
          method: 'POST',
          body: input,
          schema: s.inviteLinkSchema,
        }),
      revokeInvite: (id: string, inviteId: string) =>
        request(`/parties/${enc(id)}/invites/${enc(inviteId)}`, {
          method: 'DELETE',
          schema: s.inviteLinkSchema,
        }),
      invitePreview: (token: string, signal?: AbortSignal) =>
        request(`/invites/${enc(token)}`, { schema: s.invitePreviewSchema, signal }),
      acceptInvite: (token: string, input: s.AcceptInviteInput) =>
        request(`/invites/${enc(token)}/accept`, {
          method: 'POST',
          body: input,
          schema: s.acceptInviteResultSchema,
        }),
      /** "That's me": reconnect to an existing guest identity in this Party. */
      recoverIdentity: (id: string, userId: string) =>
        request(`/parties/${enc(id)}/recover`, {
          method: 'POST',
          body: { userId },
          schema: s.sessionSchema,
        }),
      contributions: (id: string, signal?: AbortSignal) =>
        request(`/parties/${enc(id)}/contributions`, {
          schema: z.array(s.potluckContributionSchema),
          signal,
        }),
      proposeContribution: (id: string, input: s.ProposeContributionInput) =>
        request(`/parties/${enc(id)}/contributions`, {
          method: 'POST',
          body: input,
          schema: s.potluckContributionSchema,
        }),
      setContributionStatus: (
        id: string,
        contributionId: string,
        status: 'proposed' | 'claimed' | 'brought',
      ) =>
        request(`/parties/${enc(id)}/contributions/${enc(contributionId)}`, {
          method: 'PATCH',
          body: { status },
          schema: s.potluckContributionSchema,
        }),
      recommendations: (id: string, signal?: AbortSignal) =>
        request(`/parties/${enc(id)}/recommendations`, {
          schema: s.groupRecommendationsSchema,
          signal,
        }),
    },

    foodLogs: {
      list: (signal?: AbortSignal) =>
        request('/food-logs', { schema: z.array(s.foodLogSchema), signal }),
      create: (input: s.FoodLogInput) =>
        request('/food-logs', { method: 'POST', body: input, schema: s.foodLogSchema }),
      remove: (id: string) =>
        request(`/food-logs/${enc(id)}`, { method: 'DELETE', schema: s.okSchema }),
    },

    pantry: {
      list: (signal?: AbortSignal) =>
        request('/pantry', { schema: z.array(s.pantryItemSchema), signal }),
      add: (input: s.PantryInput) =>
        request('/pantry', { method: 'POST', body: input, schema: s.pantryItemSchema }),
      remove: (id: string) =>
        request(`/pantry/${enc(id)}`, { method: 'DELETE', schema: s.okSchema }),
    },

    restaurants: {
      recommendations: (signal?: AbortSignal) =>
        request('/restaurants/recommendations', {
          schema: z.array(s.restaurantRecommendationSchema),
          signal,
        }),
    },

    calendar: {
      get: (start: string, days: number, signal?: AbortSignal) =>
        request('/calendar', { query: { start, days }, schema: s.calendarSchema, signal }),
      addEntry: (input: s.CalendarEntryInput) =>
        request('/calendar/entries', {
          method: 'POST',
          body: input,
          schema: s.calendarEntrySchema,
        }),
      removeEntry: (id: string) =>
        request(`/calendar/entries/${enc(id)}`, { method: 'DELETE', schema: s.okSchema }),
    },

    events: {
      send: (events: s.ClientEvent[]) =>
        request('/events', { method: 'POST', body: { events }, schema: s.okSchema }),
    },
  };
}

export type TastePilotApi = ReturnType<typeof createTastePilotApi>;
