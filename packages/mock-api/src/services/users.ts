import type { Me, PublicProfile, UserSummary } from '@tastepilot/api-client';
import type { MockBackend } from '../backend';
import type { UserRow } from '../db';
import { notFound } from '../errors';

export function userById(b: MockBackend, id: string) {
  const user = b.db.users.find((u) => u.id === id);
  if (!user) throw notFound('User not found');
  return user;
}

export function userByHandle(b: MockBackend, handle: string) {
  const user = b.db.users.find((u) => u.handle === handle.toLowerCase());
  if (!user) throw notFound('No cook with that handle');
  return user;
}

export const toUserSummary = (u: UserRow): UserSummary => ({
  id: u.id,
  name: u.name,
  handle: u.handle,
  kind: u.kind,
  avatarColor: u.avatarColor,
});

export const toMe = (u: UserRow): Me => ({
  ...toUserSummary(u),
  email: u.email,
  householdId: u.householdId,
  liteForPartyId: u.liteForPartyId,
  shareTasteWithParties: u.shareTasteWithParties,
  createdAt: u.createdAt,
});

export function toPublicProfile(
  b: MockBackend,
  u: UserRow,
  viewerId: string | null,
): PublicProfile {
  return {
    ...toUserSummary(u),
    bio: u.bio,
    followers: b.db.follows.filter((f) => f.followeeId === u.id).length,
    following: b.db.follows.filter((f) => f.followerId === u.id).length,
    isFollowing:
      !!viewerId && b.db.follows.some((f) => f.followerId === viewerId && f.followeeId === u.id),
    isMe: viewerId === u.id,
  };
}

const COLORS = [
  '#c2410c',
  '#0f766e',
  '#7c3aed',
  '#be185d',
  '#1d4ed8',
  '#4d7c0f',
  '#b45309',
  '#0e7490',
];
export const pickColor = (seed: string) =>
  COLORS[[...seed].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length] as string;

export function uniqueHandle(b: MockBackend, name: string) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 16) || 'cook';
  let handle = base;
  for (let i = 2; b.db.users.some((u) => u.handle === handle); i++) handle = `${base}${i}`;
  return handle;
}
