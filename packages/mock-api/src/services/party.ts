import type {
  AcceptInviteResult,
  GroupRecommendations,
  InviteLink,
  InvitePreview,
  Party,
  PartySafetySummary,
  PartySummary,
  PotluckContribution,
  RankedRecipe,
} from '@tastepilot/api-client';
import type { MockBackend } from '../backend';
import type { ContributionRow, InviteRow, PartyRow, UserRow } from '../db';
import { averageScores, explicitDislikes, pantryCoverage, scoreItem } from '../engine/ranking';
import { constraintLabel, evaluateSafety } from '../engine/safety';
import { structureIngredients } from '../engine/structure';
import { badRequest, forbidden, HttpError, notFound } from '../errors';
import { newId, newToken } from '../ids';
import {
  applyStatement,
  constraintRefs,
  prefsFor,
  toHardConstraint,
  userConstraints,
} from './profile';
import { rankable, rankingContext, recipeFor, toSummary, visibleRecipes } from './recipes';
import { pickColor, userById } from './users';

// --- Access control (IDOR) ---------------------------------------------------

export function membership(b: MockBackend, partyId: string, userId: string) {
  return b.db.memberships.find((m) => m.partyId === partyId && m.userId === userId);
}

/** Non-members get a 404, not a 403, so party ids can't be probed. */
export function partyForMember(b: MockBackend, partyId: string, userId: string) {
  const party = b.db.parties.find((p) => p.id === partyId);
  if (!party || !membership(b, partyId, userId)) throw notFound('Party not found');
  return party;
}

function requireHost(b: MockBackend, party: PartyRow, userId: string) {
  if (party.hostId !== userId) throw forbidden('Only the host can do that.');
}

const memberIds = (b: MockBackend, partyId: string) =>
  b.db.memberships.filter((m) => m.partyId === partyId).map((m) => m.userId);

const touch = (b: MockBackend, party: PartyRow) => {
  party.updatedAt = b.nowIso();
};

// --- Parties -------------------------------------------------------------------

function toPartySummary(b: MockBackend, party: PartyRow, userId: string): PartySummary {
  return {
    id: party.id,
    name: party.name,
    date: party.date,
    description: party.description,
    hostName: userById(b, party.hostId).name,
    memberCount: memberIds(b, party.id).length,
    myRole: party.hostId === userId ? 'host' : 'member',
  };
}

export function listParties(b: MockBackend, userId: string) {
  return b.db.memberships
    .filter((m) => m.userId === userId)
    .map((m) => b.db.parties.find((p) => p.id === m.partyId))
    .filter((p): p is PartyRow => !!p)
    .sort((a, c) => a.date.localeCompare(c.date))
    .map((p) => toPartySummary(b, p, userId));
}

export function getParty(b: MockBackend, partyId: string, userId: string): Party {
  const party = partyForMember(b, partyId, userId);
  return {
    ...toPartySummary(b, party, userId),
    hostId: party.hostId,
    updatedAt: party.updatedAt,
    members: b.db.memberships
      .filter((m) => m.partyId === partyId)
      .sort((a, c) =>
        a.role === 'host' ? -1 : c.role === 'host' ? 1 : a.joinedAt.localeCompare(c.joinedAt),
      )
      .map((m) => {
        const u = userById(b, m.userId);
        return {
          userId: u.id,
          name: u.name,
          kind: u.kind,
          role: m.role,
          avatarColor: u.avatarColor,
          joinedAt: m.joinedAt,
          constraints: userConstraints(b, u.id).map(toHardConstraint),
          sharesTaste: u.shareTasteWithParties,
        };
      }),
  };
}

export function createParty(
  b: MockBackend,
  userId: string,
  input: { name: string; date: string; description: string },
) {
  const now = b.nowIso();
  const party: PartyRow = {
    id: newId('pty'),
    ...input,
    hostId: userId,
    createdAt: now,
    updatedAt: now,
  };
  b.db.parties.push(party);
  b.db.memberships.push({ partyId: party.id, userId, role: 'host', joinedAt: now });
  return getParty(b, party.id, userId);
}

/**
 * Host safety summary: every member's hard constraints, merged. Drawn from
 * the same data that drives exclusion, and never gated by the taste-sharing
 * setting (that only governs taste data).
 */
export function safetySummary(b: MockBackend, partyId: string, userId: string): PartySafetySummary {
  const party = partyForMember(b, partyId, userId);
  const members = memberIds(b, partyId).map((id) => userById(b, id));
  const exclusions = new Map<string, PartySafetySummary['exclusions'][number]>();
  for (const m of members) {
    for (const c of userConstraints(b, m.id)) {
      const id = `${c.kind}:${c.key}`;
      const existing = exclusions.get(id) ?? {
        key: c.key,
        label: constraintLabel(c.kind, c.key),
        kind: c.kind,
        members: [],
      };
      existing.members.push({ userId: m.id, name: m.name });
      exclusions.set(id, existing);
    }
  }
  return {
    partyId,
    exclusions: [...exclusions.values()].sort((a, c) =>
      a.kind === c.kind ? a.label.localeCompare(c.label) : a.kind === 'allergy' ? -1 : 1,
    ),
    membersWithoutConstraints: members
      .filter((m) => userConstraints(b, m.id).length === 0)
      .map((m) => ({ userId: m.id, name: m.name })),
    updatedAt: party.updatedAt,
  };
}

// --- Invites ---------------------------------------------------------------------

const toInvite = (row: InviteRow): InviteLink => ({
  id: row.id,
  token: row.token,
  label: row.label,
  maxUses: row.maxUses,
  uses: row.uses,
  createdAt: row.createdAt,
  revokedAt: row.revokedAt,
});

export function listInvites(b: MockBackend, partyId: string, userId: string) {
  const party = partyForMember(b, partyId, userId);
  requireHost(b, party, userId);
  return b.db.invites
    .filter((i) => i.partyId === partyId)
    .sort((a, c) => c.createdAt.localeCompare(a.createdAt))
    .map(toInvite);
}

export function createInvite(
  b: MockBackend,
  partyId: string,
  userId: string,
  input: { label: string; maxUses: number | null },
) {
  const party = partyForMember(b, partyId, userId);
  requireHost(b, party, userId);
  const row: InviteRow = {
    id: newId('inv'),
    partyId,
    token: newToken().slice(0, 16),
    label: input.label,
    maxUses: input.maxUses,
    uses: 0,
    createdAt: b.nowIso(),
    revokedAt: null,
  };
  b.db.invites.push(row);
  return toInvite(row);
}

/** Revokes exactly one link; every other link keeps working. */
export function revokeInvite(b: MockBackend, partyId: string, userId: string, inviteId: string) {
  const party = partyForMember(b, partyId, userId);
  requireHost(b, party, userId);
  const row = b.db.invites.find((i) => i.id === inviteId && i.partyId === partyId);
  if (!row) throw notFound('Invite not found');
  row.revokedAt ??= b.nowIso();
  return toInvite(row);
}

function inviteByToken(b: MockBackend, token: string) {
  const row = b.db.invites.find((i) => i.token === token);
  if (!row) throw notFound('This invite link is not valid.');
  return row;
}

const inviteStatus = (row: InviteRow) =>
  row.revokedAt
    ? 'revoked'
    : row.maxUses != null && row.uses >= row.maxUses
      ? 'exhausted'
      : 'valid';

export function invitePreview(b: MockBackend, token: string, userId: string | null): InvitePreview {
  const row = inviteByToken(b, token);
  const party = b.db.parties.find((p) => p.id === row.partyId);
  if (!party) throw notFound('This invite link is not valid.');
  return {
    token,
    partyName: party.name,
    partyDate: party.date,
    hostName: userById(b, party.hostId).name,
    memberCount: memberIds(b, party.id).length,
    status: inviteStatus(row),
    alreadyMember: !!userId && !!membership(b, party.id, userId),
  };
}

/**
 * Accept an invite. Consumption is atomic: the check and the increment
 * happen together with no await in between, so two simultaneous accepts of
 * a single-use link can't both succeed.
 */
export function acceptInvite(
  b: MockBackend,
  token: string,
  sessionUser: UserRow | null,
  input: { name?: string; dietaryNote?: string },
  deviceId: string | null,
): AcceptInviteResult & { user: UserRow } {
  const row = inviteByToken(b, token);
  const party = b.db.parties.find((p) => p.id === row.partyId);
  if (!party) throw notFound('This invite link is not valid.');

  // Already a member: nothing to consume.
  if (sessionUser && membership(b, party.id, sessionUser.id)) {
    return {
      partyId: party.id,
      userId: sessionUser.id,
      createdLiteAccount: false,
      possibleDuplicateOf: null,
      user: sessionUser,
    };
  }
  // Same device rejoining (e.g. via a second link): recognize, don't duplicate.
  if (!sessionUser && deviceId) {
    const known = b.db.users.find(
      (u) => u.kind === 'lite' && u.deviceIds.includes(deviceId) && membership(b, party.id, u.id),
    );
    if (known) {
      return {
        partyId: party.id,
        userId: known.id,
        createdLiteAccount: false,
        possibleDuplicateOf: null,
        user: known,
      };
    }
  }

  const status = inviteStatus(row);
  if (status === 'revoked')
    throw new HttpError(410, 'invite_revoked', 'The host has turned off this invite link.');
  if (status === 'exhausted')
    throw new HttpError(410, 'invite_exhausted', 'This invite link has already been used.');
  if (!sessionUser && !input.name?.trim()) throw badRequest('Tell the host your name.');

  // --- atomic section: validate-and-consume ---
  row.uses += 1;
  const now = b.nowIso();
  let user = sessionUser;
  let createdLiteAccount = false;
  if (!user) {
    const name = (input.name ?? '').trim();
    user = {
      id: newId('usr'),
      kind: 'lite',
      name,
      handle: null,
      email: null,
      password: null,
      bio: '',
      avatarColor: pickColor(name + now),
      householdId: null,
      liteForPartyId: party.id,
      deviceIds: deviceId ? [deviceId] : [],
      shareTasteWithParties: true,
      createdAt: now,
    };
    b.db.users.push(user);
    createdLiteAccount = true;
  }
  b.db.memberships.push({ partyId: party.id, userId: user.id, role: 'member', joinedAt: now });
  // --- end atomic section ---

  if (input.dietaryNote?.trim()) applyStatement(b, user.id, input.dietaryNote);
  touch(b, party);

  // Flag (never block) a likely duplicate guest: same name, different identity.
  const normalized = user.name.trim().toLowerCase();
  const duplicate = createdLiteAccount
    ? memberIds(b, party.id)
        .map((id) => userById(b, id))
        .find(
          (u) =>
            u.id !== user.id && u.kind === 'lite' && u.name.trim().toLowerCase() === normalized,
        )
    : undefined;

  return {
    partyId: party.id,
    userId: user.id,
    createdLiteAccount,
    possibleDuplicateOf: duplicate ? { userId: duplicate.id, name: duplicate.name } : null,
    user,
  };
}

/**
 * "That's me": a guest who just joined as a new lite account reconnects to
 * their existing lite identity in this party (cross-device recovery). The
 * just-created duplicate is folded away.
 */
export function recoverIdentity(
  b: MockBackend,
  partyId: string,
  current: UserRow,
  targetUserId: string,
  deviceId: string | null,
) {
  partyForMember(b, partyId, current.id);
  const target = userById(b, targetUserId);
  if (
    current.kind !== 'lite' ||
    target.kind !== 'lite' ||
    target.id === current.id ||
    !membership(b, partyId, target.id)
  ) {
    throw forbidden('That identity cannot be recovered here.');
  }
  if (deviceId && !target.deviceIds.includes(deviceId)) target.deviceIds.push(deviceId);
  // Keep any constraints the guest just entered.
  for (const c of userConstraints(b, current.id)) {
    if (!userConstraints(b, target.id).some((t) => t.kind === c.kind && t.key === c.key))
      c.userId = target.id;
  }
  b.db.constraints = b.db.constraints.filter((c) => c.userId !== current.id);
  b.db.memberships = b.db.memberships.filter((m) => m.userId !== current.id);
  b.db.evidence = b.db.evidence.filter((e) => e.userId !== current.id);
  b.db.users = b.db.users.filter((u) => u.id !== current.id);
  return target;
}

// --- Potluck -------------------------------------------------------------------

function contributionIngredients(b: MockBackend, row: ContributionRow, userId: string) {
  if (row.recipeId) {
    try {
      return recipeFor(b, userId, row.recipeId).ingredients;
    } catch {
      return row.ingredients;
    }
  }
  return row.ingredients;
}

/** Checked against every *other* member's hard constraints. */
function toContribution(
  b: MockBackend,
  row: ContributionRow,
  viewerId: string,
): PotluckContribution {
  const ingredients = contributionIngredients(b, row, viewerId);
  const others = memberIds(b, row.partyId).filter((id) => id !== row.memberId);
  const result = evaluateSafety(
    structureIngredients(ingredients),
    constraintRefs(b, others, { named: true }),
    b.nowIso(),
  );
  return {
    id: row.id,
    partyId: row.partyId,
    memberId: row.memberId,
    memberName: userById(b, row.memberId).name,
    dishName: row.dishName,
    recipeId: row.recipeId,
    ingredients,
    course: row.course,
    status: row.status,
    safety: {
      status: result.status,
      conflicts: result.reasons
        .filter((r) => r.kind === 'conflict')
        .map((r) => ({
          memberName: r.memberName ?? '',
          constraintLabel: r.constraintLabel ?? '',
          ingredient: r.ingredient,
        })),
      unverifiedIngredients: result.reasons
        .filter((r) => r.kind === 'unmapped_ingredient')
        .map((r) => r.ingredient),
    },
    createdAt: row.createdAt,
  };
}

export function listContributions(b: MockBackend, partyId: string, userId: string) {
  partyForMember(b, partyId, userId);
  return b.db.contributions
    .filter((c) => c.partyId === partyId)
    .sort((a, c) => a.createdAt.localeCompare(c.createdAt))
    .map((c) => toContribution(b, c, userId));
}

export function proposeContribution(
  b: MockBackend,
  partyId: string,
  userId: string,
  input: {
    dishName: string;
    recipeId: string | null;
    ingredients: string[];
    course: ContributionRow['course'];
  },
) {
  const party = partyForMember(b, partyId, userId);
  if (input.recipeId) recipeFor(b, userId, input.recipeId);
  if (!input.recipeId && input.ingredients.length === 0) {
    throw badRequest('List the ingredients so everyone can be checked for allergies.');
  }
  const row: ContributionRow = {
    id: newId('pot'),
    partyId,
    memberId: userId,
    dishName: input.dishName,
    recipeId: input.recipeId,
    ingredients: input.recipeId ? [] : input.ingredients,
    course: input.course,
    status: 'proposed',
    createdAt: b.nowIso(),
  };
  b.db.contributions.push(row);
  touch(b, party);
  return toContribution(b, row, userId);
}

export function setContributionStatus(
  b: MockBackend,
  partyId: string,
  userId: string,
  contributionId: string,
  status: ContributionRow['status'],
) {
  const party = partyForMember(b, partyId, userId);
  const row = b.db.contributions.find((c) => c.id === contributionId && c.partyId === partyId);
  if (!row) throw notFound('Contribution not found');
  if (row.memberId !== userId && party.hostId !== userId)
    throw forbidden('Only the person bringing it or the host can change this.');
  row.status = status;
  touch(b, party);
  return toContribution(b, row, userId);
}

// --- Group recommendations -------------------------------------------------------

/**
 * Recipes for the whole party. A recipe that conflicts with *any* member's
 * hard constraint is excluded outright. A confidently explicit dislike from a
 * member who shares taste data also excludes (solo, it only penalises).
 * When nothing survives, explain why instead of returning an empty list.
 */
export function groupRecommendations(
  b: MockBackend,
  partyId: string,
  userId: string,
): GroupRecommendations {
  partyForMember(b, partyId, userId);
  const ids = memberIds(b, partyId);
  const members = ids.map((id) => userById(b, id));
  const refs = constraintRefs(b, ids, { named: true });
  const tasteMembers = members.filter((m) => m.shareTasteWithParties);
  const contexts = tasteMembers.map((m) => ({
    member: m,
    ctx: rankingContext(b, m.id),
    prefs: prefsFor(b, m.id),
  }));
  const now = b.nowIso();

  const results: RankedRecipe[] = [];
  const blockers = new Map<
    string,
    { label: string; memberNames: Set<string>; excludedCount: number }
  >();
  let excludedCount = 0;

  for (const row of visibleRecipes(b, userId)) {
    const item = rankable(b, row);
    const safety = evaluateSafety(item.ingredients, refs, now);
    const dislikedBy = contexts.filter((c) => explicitDislikes(item, c.prefs).length > 0);
    if (safety.status === 'conflict' || dislikedBy.length > 0) {
      excludedCount += 1;
      for (const r of safety.reasons.filter((x) => x.kind === 'conflict')) {
        const key = r.constraintLabel ?? '';
        const entry = blockers.get(key) ?? {
          label: key,
          memberNames: new Set<string>(),
          excludedCount: 0,
        };
        entry.memberNames.add(r.memberName ?? '');
        blockers.set(key, entry);
      }
      for (const c of dislikedBy) {
        const key = `dislikes:${c.member.id}`;
        const entry = blockers.get(key) ?? {
          label: `${c.member.name}'s stated dislikes`,
          memberNames: new Set([c.member.name]),
          excludedCount: 0,
        };
        blockers.set(key, entry);
      }
      // Count each recipe once per distinct blocker.
      const hit = new Set([
        ...safety.reasons.filter((x) => x.kind === 'conflict').map((x) => x.constraintLabel ?? ''),
        ...dislikedBy.map((c) => `dislikes:${c.member.id}`),
      ]);
      for (const key of hit) {
        const entry = blockers.get(key);
        if (entry) entry.excludedCount += 1;
      }
      continue;
    }
    const scores = contexts.length
      ? contexts.map((c) => scoreItem(item, c.ctx))
      : [scoreItem(item, rankingContext(b, userId))];
    results.push({
      recipe: toSummary(b, row),
      safety,
      score: averageScores(scores),
      pantryMatch: pantryCoverage(item, rankingContext(b, userId).pantryKeys),
    });
  }

  results.sort((a, c) => c.score.total - a.score.total);
  const sortedBlockers = [...blockers.values()]
    .sort((a, c) => c.excludedCount - a.excludedCount)
    .map((x) => ({
      label: x.label,
      memberNames: [...x.memberNames].filter(Boolean),
      excludedCount: x.excludedCount,
    }));

  return {
    results: results.slice(0, 12),
    excludedCount,
    diagnosis:
      results.length === 0
        ? {
            message: `No recipe in the catalog works for all ${members.length} members together.`,
            blockers: sortedBlockers,
            suggestion:
              sortedBlockers.length > 0
                ? `The biggest blocker is ${sortedBlockers[0]?.label.toLowerCase()}. Consider a potluck, where each dish is checked against everyone else's needs, or ask members to bring dishes that suit them.`
                : 'Try adding more recipes to the catalog.',
          }
        : null,
  };
}
