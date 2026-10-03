import type { MockBackend } from '../backend';
import type { SessionRow, UserRow } from '../db';
import { HttpError } from '../errors';
import { newId, newToken } from '../ids';
import { listFoodLogs, listPantry } from './life';
import { tasteProfile } from './profile';
import { pickColor, toMe, uniqueHandle, userById } from './users';

const MAX_FAILURES = 5;
const WINDOW_MS = 5 * 60 * 1000;

export function createSession(b: MockBackend, userId: string): SessionRow {
  const session: SessionRow = {
    token: newToken(),
    csrf: newToken(),
    userId,
    createdAt: b.nowIso(),
  };
  b.db.sessions.push(session);
  return session;
}

export function sessionByToken(b: MockBackend, token: string | undefined) {
  if (!token) return null;
  const session = b.db.sessions.find((s) => s.token === token);
  if (!session || !b.db.users.some((u) => u.id === session.userId)) return null;
  return session;
}

export function endSession(b: MockBackend, token: string | undefined) {
  b.db.sessions = b.db.sessions.filter((s) => s.token !== token);
}

export function signup(b: MockBackend, input: { name: string; email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  if (b.db.users.some((u) => u.email === email)) {
    throw new HttpError(
      409,
      'email_taken',
      'An account with that email already exists. Try logging in.',
    );
  }
  const now = b.nowIso();
  const user: UserRow = {
    id: newId('usr'),
    kind: 'full',
    name: input.name.trim(),
    handle: uniqueHandle(b, input.name),
    email,
    password: input.password,
    bio: '',
    avatarColor: pickColor(email),
    householdId: null,
    liteForPartyId: null,
    deviceIds: [],
    shareTasteWithParties: true,
    createdAt: now,
  };
  b.db.users.push(user);
  return user;
}

/** Brute-force protection: 5 failures per email per 5 minutes. */
export function login(b: MockBackend, input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const nowMs = b.now().getTime();
  const recent = (b.db.loginFailures[email] ?? []).filter((t) => nowMs - Date.parse(t) < WINDOW_MS);
  if (recent.length >= MAX_FAILURES) {
    const retryAfter = Math.ceil((WINDOW_MS - (nowMs - Date.parse(recent[0] as string))) / 1000);
    throw new HttpError(
      429,
      'rate_limited',
      'Too many sign-in attempts. Please wait a few minutes and try again.',
      { retryAfter },
      { 'Retry-After': String(retryAfter) },
    );
  }
  const user = b.db.users.find((u) => u.email === email && u.kind === 'full');
  if (!user || user.password !== input.password) {
    b.db.loginFailures[email] = [...recent, b.nowIso()];
    throw new HttpError(401, 'invalid_credentials', 'That email and password don’t match.');
  }
  delete b.db.loginFailures[email];
  return user;
}

/** Lite to full, in place: same user id, so history and memberships carry over. */
export function claim(b: MockBackend, userId: string, input: { email: string; password: string }) {
  const user = userById(b, userId);
  if (user.kind !== 'lite')
    throw new HttpError(400, 'already_full', 'This account is already a full account.');
  const email = input.email.trim().toLowerCase();
  if (b.db.users.some((u) => u.email === email)) {
    throw new HttpError(
      409,
      'email_taken',
      'That email already has an account. Log in with it instead.',
    );
  }
  Object.assign(user, {
    kind: 'full',
    email,
    password: input.password,
    handle: uniqueHandle(b, user.name),
    liteForPartyId: null,
  } satisfies Partial<UserRow>);
  return user;
}

export function exportData(b: MockBackend, userId: string) {
  const user = userById(b, userId);
  return {
    exportedAt: b.nowIso(),
    account: toMe(user),
    tasteProfile: tasteProfile(b, userId),
    evidence: b.db.evidence.filter((e) => e.userId === userId),
    foodHistory: listFoodLogs(b, userId),
    pantry: listPantry(b, userId),
    recipes: b.db.recipes.filter((r) => r.authorId === userId),
    posts: b.db.posts.filter((p) => p.authorId === userId),
    partyMemberships: b.db.memberships.filter((m) => m.userId === userId),
  };
}

/** Delete profile, preference and food-history data; the account remains. */
export function deleteData(b: MockBackend, userId: string) {
  b.db.constraints = b.db.constraints.filter((c) => c.userId !== userId);
  b.db.evidence = b.db.evidence.filter((e) => e.userId !== userId);
  b.db.feedback = b.db.feedback.filter((f) => f.userId !== userId);
  b.db.foodLogs = b.db.foodLogs.filter((l) => l.userId !== userId);
  b.db.pantry = b.db.pantry.filter((p) => p.userId !== userId);
}

export function deleteAccount(b: MockBackend, userId: string) {
  deleteData(b, userId);
  const hosted = b.db.parties.filter((p) => p.hostId === userId).map((p) => p.id);
  b.db.parties = b.db.parties.filter((p) => !hosted.includes(p.id));
  b.db.memberships = b.db.memberships.filter(
    (m) => m.userId !== userId && !hosted.includes(m.partyId),
  );
  b.db.invites = b.db.invites.filter((i) => !hosted.includes(i.partyId));
  b.db.contributions = b.db.contributions.filter(
    (c) => c.memberId !== userId && !hosted.includes(c.partyId),
  );
  b.db.posts = b.db.posts.filter((p) => p.authorId !== userId);
  b.db.follows = b.db.follows.filter((f) => f.followerId !== userId && f.followeeId !== userId);
  b.db.recipes = b.db.recipes.filter((r) => r.authorId !== userId || r.published);
  b.db.sessions = b.db.sessions.filter((s) => s.userId !== userId);
  b.db.users = b.db.users.filter((u) => u.id !== userId);
}

export { newId };
