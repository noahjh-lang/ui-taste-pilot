import type { Mention, RecipePost } from '@tastepilot/api-client';
import type { MockBackend } from '../backend';
import type { PostRow } from '../db';
import { badRequest } from '../errors';
import { newId } from '../ids';
import { recipeFor, toSummary } from './recipes';
import { toPublicProfile, toUserSummary, userByHandle, userById } from './users';

const MENTION = /(^|[^\w@])@([a-z0-9_]{2,20})\b/gi;

function mentionsIn(b: MockBackend, body: string) {
  const found = new Map<string, string>();
  for (const m of body.matchAll(MENTION)) {
    const handle = (m[2] ?? '').toLowerCase();
    const user = b.db.users.find((u) => u.handle === handle);
    if (user) found.set(handle, user.id);
  }
  return [...found].map(([handle, userId]) => ({ handle, userId }));
}

const toPost = (b: MockBackend, row: PostRow): RecipePost => ({
  id: row.id,
  recipeId: row.recipeId,
  kind: row.kind,
  author: toUserSummary(userById(b, row.authorId)),
  rating: row.rating,
  body: row.body,
  photoUrl: row.photoUrl,
  mentions: mentionsIn(b, row.body),
  createdAt: row.createdAt,
});

export function listPosts(b: MockBackend, userId: string | null, recipeId: string) {
  recipeFor(b, userId, recipeId);
  return b.db.posts
    .filter((p) => p.recipeId === recipeId)
    .sort((a, c) => c.createdAt.localeCompare(a.createdAt))
    .map((p) => toPost(b, p));
}

/** Community content is informational only and never changes safety results. */
export function createPost(
  b: MockBackend,
  userId: string,
  recipeId: string,
  input: { kind: PostRow['kind']; rating: number | null; body: string; photoUrl: string | null },
) {
  recipeFor(b, userId, recipeId);
  if (input.kind === 'review' && input.rating == null)
    throw badRequest('A review needs a star rating.');
  if (input.photoUrl && !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(input.photoUrl)) {
    throw badRequest('Photos must be PNG, JPEG, WebP or GIF.');
  }
  const row: PostRow = {
    id: newId('post'),
    recipeId,
    kind: input.kind,
    authorId: userId,
    rating: input.kind === 'review' ? input.rating : null,
    body: input.body,
    photoUrl: input.photoUrl,
    createdAt: b.nowIso(),
  };
  b.db.posts.push(row);
  return toPost(b, row);
}

export function cookbook(b: MockBackend, userId: string, filter: 'all' | 'following' | 'mine') {
  const followed = new Set(
    b.db.follows.filter((f) => f.followerId === userId).map((f) => f.followeeId),
  );
  return {
    recipes: b.db.recipes
      .filter((r) => {
        if (filter === 'mine') return r.authorId === userId;
        if (!r.published || !r.authorId) return false;
        return filter === 'following' ? followed.has(r.authorId) : true;
      })
      .sort((a, c) => c.createdAt.localeCompare(a.createdAt))
      .map((r) => toSummary(b, r)),
  };
}

export function profile(b: MockBackend, handle: string, viewerId: string | null) {
  return toPublicProfile(b, userByHandle(b, handle), viewerId);
}

export function userRecipes(b: MockBackend, handle: string) {
  const user = userByHandle(b, handle);
  return b.db.recipes
    .filter((r) => r.authorId === user.id && r.published)
    .sort((a, c) => c.createdAt.localeCompare(a.createdAt))
    .map((r) => toSummary(b, r));
}

export function setFollow(b: MockBackend, userId: string, handle: string, follow: boolean) {
  const target = userByHandle(b, handle);
  if (target.id === userId) throw badRequest("You can't follow yourself.");
  b.db.follows = b.db.follows.filter(
    (f) => !(f.followerId === userId && f.followeeId === target.id),
  );
  if (follow) b.db.follows.push({ followerId: userId, followeeId: target.id });
  return toPublicProfile(b, target, userId);
}

export function mentionsOf(b: MockBackend, userId: string): Mention[] {
  const me = userById(b, userId);
  if (!me.handle) return [];
  return b.db.posts
    .filter((p) => mentionsIn(b, p.body).some((m) => m.userId === userId))
    .sort((a, c) => c.createdAt.localeCompare(a.createdAt))
    .map((p) => ({
      post: toPost(b, p),
      recipeTitle: b.db.recipes.find((r) => r.id === p.recipeId)?.title ?? 'a recipe',
    }));
}
