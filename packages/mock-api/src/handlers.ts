import {
  acceptInviteInputSchema,
  accountSettingsInputSchema,
  calendarEntryInputSchema,
  claimInputSchema,
  constraintInputSchema,
  createInviteInputSchema,
  createPartyInputSchema,
  eventBatchSchema,
  feedbackInputSchema,
  foodLogInputSchema,
  generateInputSchema,
  loginInputSchema,
  pantryInputSchema,
  preferenceInputSchema,
  proposeContributionInputSchema,
  recipeDraftSchema,
  recipePostInputSchema,
  signupInputSchema,
  statementInputSchema,
} from '@tastepilot/api-client';
import { HttpResponse } from 'msw';
import { z } from 'zod';
import type { MockBackend } from './backend';
import { badRequest, notFound } from './errors';
import { authed, createRouter, parseBody, readJson, sessionCookies } from './http';
import * as auth from './services/auth';
import * as community from './services/community';
import * as life from './services/life';
import * as party from './services/party';
import * as profile from './services/profile';
import * as recipes from './services/recipes';
import { toMe } from './services/users';

const ok = { ok: true as const };

/** All stub endpoints, mounted under `base` (default `/api`). */
export function createHandlers(b: MockBackend, base = '/api') {
  const { route, handlers } = createRouter(b, base);
  const session = (user: Parameters<typeof toMe>[0] | null) => ({ user: user ? toMe(user) : null });

  // --- Auth & account ---------------------------------------------------------

  route('get', '/session', 'public', ({ user }) => session(user));

  route('post', '/auth/signup', 'public', async ({ request }) => {
    const input = parseBody(signupInputSchema, await readJson(request));
    const user = auth.signup(b, input);
    return HttpResponse.json(session(user), {
      headers: sessionCookies(auth.createSession(b, user.id)),
    });
  });

  route('post', '/auth/login', 'public', async ({ request }) => {
    const input = parseBody(loginInputSchema, await readJson(request));
    const user = auth.login(b, input);
    return HttpResponse.json(session(user), {
      headers: sessionCookies(auth.createSession(b, user.id)),
    });
  });

  route('post', '/auth/logout', 'public', ({ session: s }) => {
    auth.endSession(b, s?.token);
    return HttpResponse.json(ok, { headers: sessionCookies(null) });
  });

  route('post', '/auth/claim', 'session', async (ctx) => {
    const { user } = authed(ctx);
    const input = parseBody(claimInputSchema, await readJson(ctx.request));
    return session(auth.claim(b, user.id, input));
  });

  route('patch', '/me/settings', 'session', async (ctx) => {
    const { user } = authed(ctx);
    const input = parseBody(accountSettingsInputSchema, await readJson(ctx.request));
    user.shareTasteWithParties = input.shareTasteWithParties;
    return session(user);
  });

  route('get', '/me/export', 'session', (ctx) => auth.exportData(b, authed(ctx).user.id));
  route('delete', '/me/data', 'session', (ctx) => {
    auth.deleteData(b, authed(ctx).user.id);
    return ok;
  });
  route('delete', '/me', 'session', (ctx) => {
    auth.deleteAccount(b, authed(ctx).user.id);
    return HttpResponse.json(ok, { headers: sessionCookies(null) });
  });

  // --- Taste profile ------------------------------------------------------------

  route('get', '/profile', 'session', (ctx) => profile.tasteProfile(b, authed(ctx).user.id));
  route('get', '/profile/preferences/:id', 'session', (ctx) =>
    profile.preferenceDetail(b, authed(ctx).user.id, ctx.params.id ?? ''),
  );
  // Public so a guest can preview how their dietary note will be read before joining.
  route('post', '/profile/statements/parse', 'public', async ({ request }) => {
    const { text } = parseBody(statementInputSchema, await readJson(request));
    return profile.parse(text);
  });
  route('post', '/profile/statements', 'session', async (ctx) => {
    const { user } = authed(ctx);
    const { text } = parseBody(statementInputSchema, await readJson(ctx.request));
    profile.applyStatement(b, user.id, text);
    return profile.tasteProfile(b, user.id);
  });
  route('post', '/profile/constraints', 'session', async (ctx) => {
    const { user } = authed(ctx);
    const input = parseBody(constraintInputSchema, await readJson(ctx.request));
    profile.addConstraint(b, user.id, { ...input, source: 'structured', sourceText: null });
    return profile.tasteProfile(b, user.id);
  });
  route('delete', '/profile/constraints/:id', 'session', (ctx) => {
    const { user } = authed(ctx);
    profile.removeConstraint(b, user.id, ctx.params.id ?? '');
    return profile.tasteProfile(b, user.id);
  });
  route('post', '/profile/preferences', 'session', async (ctx) => {
    const { user } = authed(ctx);
    const input = parseBody(preferenceInputSchema, await readJson(ctx.request));
    profile.setExplicitPreference(b, user.id, input);
    return profile.tasteProfile(b, user.id);
  });
  route('delete', '/profile/preferences/:id', 'session', (ctx) => {
    const { user } = authed(ctx);
    profile.removeExplicitPreference(b, user.id, ctx.params.id ?? '');
    return profile.tasteProfile(b, user.id);
  });
  route('get', '/constraints/options', 'public', () => profile.constraintOptions());

  // --- Recipes, search & discovery ----------------------------------------------

  route('get', '/feed/home', 'full', (ctx) => recipes.homeFeed(b, authed(ctx).user.id));
  route('get', '/discover', 'full', (ctx) => recipes.discover(b, authed(ctx).user.id));
  route('get', '/search', 'full', (ctx) => {
    const p = ctx.url.searchParams;
    const maxTime = p.get('maxTime');
    return recipes.search(b, authed(ctx).user.id, {
      q: p.get('q') ?? '',
      tags: p.getAll('tags'),
      maxTime: maxTime ? Number(maxTime) : null,
      hideConflicts: p.get('hideConflicts') === 'true',
    });
  });
  route('get', '/recipes/tags', 'full', () => recipes.allTags(b));
  route('get', '/recipes/mine', 'full', (ctx) => recipes.myRecipes(b, authed(ctx).user.id));
  route('post', '/recipes/generate', 'full', async (ctx) => {
    const input = parseBody(generateInputSchema, await readJson(ctx.request));
    return recipes.generateDraft(b, authed(ctx).user.id, input.prompt, input.usePantry);
  });
  route('post', '/recipes', 'full', async (ctx) => {
    const raw = (await readJson(ctx.request)) as Record<string, unknown>;
    const draft = parseBody(recipeDraftSchema, raw);
    return recipes.createRecipe(
      b,
      authed(ctx).user.id,
      draft,
      raw.source === 'community' ? 'community' : 'ai_generated',
    );
  });
  route('get', '/recipes/:id', 'full', (ctx) =>
    recipes.recipeDetail(b, authed(ctx).user.id, ctx.params.id ?? ''),
  );
  route('put', '/recipes/:id', 'full', async (ctx) => {
    const draft = parseBody(recipeDraftSchema, await readJson(ctx.request));
    return recipes.updateRecipe(b, authed(ctx).user.id, ctx.params.id ?? '', draft);
  });
  route('get', '/recipes/:id/safety', 'full', (ctx) =>
    recipes.recipeSafety(b, authed(ctx).user.id, ctx.params.id ?? ''),
  );
  route('put', '/recipes/:id/feedback', 'full', async (ctx) => {
    const { feedback } = parseBody(feedbackInputSchema, await readJson(ctx.request));
    recipes.setFeedback(b, authed(ctx).user.id, ctx.params.id ?? '', feedback);
    return ok;
  });
  route('post', '/recipes/:id/publish', 'full', async (ctx) => {
    const { published } = parseBody(
      z.object({ published: z.boolean() }),
      await readJson(ctx.request),
    );
    return recipes.setPublished(b, authed(ctx).user.id, ctx.params.id ?? '', published);
  });
  route('get', '/public/recipes/:id', 'public', (ctx) =>
    recipes.publicRecipe(b, ctx.params.id ?? ''),
  );

  // --- Community ------------------------------------------------------------------

  route('get', '/cookbook', 'full', (ctx) => {
    const filter = ctx.url.searchParams.get('filter');
    return community.cookbook(
      b,
      authed(ctx).user.id,
      filter === 'following' || filter === 'mine' ? filter : 'all',
    );
  });
  route('get', '/recipes/:id/posts', 'public', (ctx) =>
    community.listPosts(b, ctx.user?.id ?? null, ctx.params.id ?? ''),
  );
  route('post', '/recipes/:id/posts', 'full', async (ctx) => {
    const input = parseBody(recipePostInputSchema, await readJson(ctx.request));
    return community.createPost(b, authed(ctx).user.id, ctx.params.id ?? '', input);
  });
  route('get', '/users/:handle', 'public', (ctx) =>
    community.profile(b, ctx.params.handle ?? '', ctx.user?.id ?? null),
  );
  route('get', '/users/:handle/recipes', 'public', (ctx) =>
    community.userRecipes(b, ctx.params.handle ?? ''),
  );
  route('post', '/users/:handle/follow', 'full', (ctx) =>
    community.setFollow(b, authed(ctx).user.id, ctx.params.handle ?? '', true),
  );
  route('delete', '/users/:handle/follow', 'full', (ctx) =>
    community.setFollow(b, authed(ctx).user.id, ctx.params.handle ?? '', false),
  );
  route('get', '/mentions', 'full', (ctx) => community.mentionsOf(b, authed(ctx).user.id));

  // --- Meal Party -------------------------------------------------------------------

  route('get', '/parties', 'session', (ctx) => party.listParties(b, authed(ctx).user.id));
  route('post', '/parties', 'full', async (ctx) => {
    const input = parseBody(createPartyInputSchema, await readJson(ctx.request));
    return party.createParty(b, authed(ctx).user.id, input);
  });
  route('get', '/parties/:id', 'session', (ctx) =>
    party.getParty(b, ctx.params.id ?? '', authed(ctx).user.id),
  );
  route('get', '/parties/:id/safety-summary', 'session', (ctx) =>
    party.safetySummary(b, ctx.params.id ?? '', authed(ctx).user.id),
  );
  route('get', '/parties/:id/invites', 'session', (ctx) =>
    party.listInvites(b, ctx.params.id ?? '', authed(ctx).user.id),
  );
  route('post', '/parties/:id/invites', 'session', async (ctx) => {
    const input = parseBody(createInviteInputSchema, await readJson(ctx.request));
    return party.createInvite(b, ctx.params.id ?? '', authed(ctx).user.id, input);
  });
  route('delete', '/parties/:id/invites/:inviteId', 'session', (ctx) =>
    party.revokeInvite(b, ctx.params.id ?? '', authed(ctx).user.id, ctx.params.inviteId ?? ''),
  );
  route('get', '/invites/:token', 'public', (ctx) =>
    party.invitePreview(b, ctx.params.token ?? '', ctx.user?.id ?? null),
  );
  route('post', '/invites/:token/accept', 'public', async (ctx) => {
    const input = parseBody(acceptInviteInputSchema, await readJson(ctx.request));
    const { user, ...result } = party.acceptInvite(
      b,
      ctx.params.token ?? '',
      ctx.user,
      input,
      ctx.deviceId,
    );
    // A new guest (or a recognised returning one) gets a session for this party.
    if (!ctx.user) {
      return HttpResponse.json(result, { headers: sessionCookies(auth.createSession(b, user.id)) });
    }
    return result;
  });
  route('post', '/parties/:id/recover', 'session', async (ctx) => {
    const { user, session: s } = authed(ctx);
    const { userId } = parseBody(z.object({ userId: z.string() }), await readJson(ctx.request));
    const target = party.recoverIdentity(b, ctx.params.id ?? '', user, userId, ctx.deviceId);
    auth.endSession(b, s.token);
    return HttpResponse.json(session(target), {
      headers: sessionCookies(auth.createSession(b, target.id)),
    });
  });
  route('get', '/parties/:id/contributions', 'session', (ctx) =>
    party.listContributions(b, ctx.params.id ?? '', authed(ctx).user.id),
  );
  route('post', '/parties/:id/contributions', 'session', async (ctx) => {
    const input = parseBody(proposeContributionInputSchema, await readJson(ctx.request));
    return party.proposeContribution(b, ctx.params.id ?? '', authed(ctx).user.id, input);
  });
  route('patch', '/parties/:id/contributions/:contributionId', 'session', async (ctx) => {
    const { status } = parseBody(
      z.object({ status: z.enum(['proposed', 'claimed', 'brought']) }),
      await readJson(ctx.request),
    );
    return party.setContributionStatus(
      b,
      ctx.params.id ?? '',
      authed(ctx).user.id,
      ctx.params.contributionId ?? '',
      status,
    );
  });
  route('get', '/parties/:id/recommendations', 'session', (ctx) =>
    party.groupRecommendations(b, ctx.params.id ?? '', authed(ctx).user.id),
  );

  // --- Food history, pantry, restaurants, calendar ---------------------------------

  route('get', '/food-logs', 'full', (ctx) => life.listFoodLogs(b, authed(ctx).user.id));
  route('post', '/food-logs', 'full', async (ctx) => {
    const input = parseBody(foodLogInputSchema, await readJson(ctx.request));
    return life.logFood(b, authed(ctx).user.id, input);
  });
  route('delete', '/food-logs/:id', 'full', (ctx) => {
    life.deleteFoodLog(b, authed(ctx).user.id, ctx.params.id ?? '');
    return ok;
  });

  route('get', '/pantry', 'full', (ctx) => life.listPantry(b, authed(ctx).user.id));
  route('post', '/pantry', 'full', async (ctx) => {
    const input = parseBody(pantryInputSchema, await readJson(ctx.request));
    return life.addPantryItem(b, authed(ctx).user.id, input);
  });
  route('delete', '/pantry/:id', 'full', (ctx) => {
    life.removePantryItem(b, authed(ctx).user.id, ctx.params.id ?? '');
    return ok;
  });

  route('get', '/restaurants/recommendations', 'full', (ctx) =>
    life.restaurantRecommendations(b, authed(ctx).user.id),
  );

  route('get', '/calendar', 'full', (ctx) => {
    const start = ctx.url.searchParams.get('start');
    const days = Number(ctx.url.searchParams.get('days') ?? 7);
    if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) throw badRequest('start must be YYYY-MM-DD');
    return life.calendar(b, authed(ctx).user.id, start, days);
  });
  route('post', '/calendar/entries', 'full', async (ctx) => {
    const input = parseBody(calendarEntryInputSchema, await readJson(ctx.request));
    return life.addCalendarEntry(b, authed(ctx).user.id, input);
  });
  route('delete', '/calendar/entries/:id', 'full', (ctx) => {
    life.removeCalendarEntry(b, authed(ctx).user.id, ctx.params.id ?? '');
    return ok;
  });

  // --- Events -----------------------------------------------------------------------

  route('post', '/events', 'public', async (ctx) => {
    const { events } = parseBody(eventBatchSchema, await readJson(ctx.request));
    const receivedAt = b.nowIso();
    b.db.events.push(...events.map((e) => ({ ...e, userId: ctx.user?.id ?? null, receivedAt })));
    b.db.events = b.db.events.slice(-500);
    return ok;
  });

  // Anything else under the API prefix is a 404 in the standard error shape.
  route('get', '/*', 'public', () => {
    throw notFound('No such endpoint');
  });

  return handlers;
}
