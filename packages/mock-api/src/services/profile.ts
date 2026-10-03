import type {
  HardConstraint,
  Preference,
  PreferenceDetail,
  StatementParse,
  TasteProfile,
} from '@tastepilot/api-client';
import type { MockBackend } from '../backend';
import { ALLERGENS, DIETS } from '../data/ingredients';
import type { ConstraintRow, EvidenceRow } from '../db';
import { parseStatement } from '../engine/parse';
import { prefLabel, replayEvidence, type PrefState, type PrefType } from '../engine/preferences';
import { prefId } from '../engine/ranking';
import { constraintLabel, type ConstraintRef } from '../engine/safety';
import { badRequest, notFound } from '../errors';
import { newId } from '../ids';
import { userById } from './users';

// --- Constraints ---------------------------------------------------------------

export const userConstraints = (b: MockBackend, userId: string) =>
  b.db.constraints.filter((c) => c.userId === userId);

export const toHardConstraint = (c: ConstraintRow): HardConstraint => ({
  id: c.id,
  kind: c.kind,
  key: c.key,
  label: constraintLabel(c.kind, c.key),
  source: c.source,
  sourceText: c.sourceText,
  createdAt: c.createdAt,
});

/** Constraint refs for a set of people, tagged with names for group checks. */
export function constraintRefs(
  b: MockBackend,
  userIds: string[],
  { named }: { named: boolean },
): ConstraintRef[] {
  return userIds.flatMap((id) => {
    const name = named ? userById(b, id).name : null;
    return userConstraints(b, id).map((c) => ({ kind: c.kind, key: c.key, memberName: name }));
  });
}

export function addConstraint(
  b: MockBackend,
  userId: string,
  input: {
    kind: 'allergy' | 'diet';
    key: string;
    source: 'structured' | 'statement';
    sourceText: string | null;
  },
) {
  const valid = input.kind === 'allergy' ? input.key in ALLERGENS : input.key in DIETS;
  if (!valid) throw badRequest(`Unknown ${input.kind}: ${input.key}`);
  const existing = b.db.constraints.find(
    (c) => c.userId === userId && c.kind === input.kind && c.key === input.key,
  );
  if (existing) return existing;
  const row: ConstraintRow = { id: newId('con'), userId, ...input, createdAt: b.nowIso() };
  b.db.constraints.push(row);
  return row;
}

export function removeConstraint(b: MockBackend, userId: string, id: string) {
  const before = b.db.constraints.length;
  b.db.constraints = b.db.constraints.filter((c) => !(c.id === id && c.userId === userId));
  if (b.db.constraints.length === before) throw notFound('Constraint not found');
}

export function constraintOptions() {
  return [
    ...Object.entries(ALLERGENS).map(([key, label]) => ({ kind: 'allergy' as const, key, label })),
    ...Object.entries(DIETS).map(([key, label]) => ({ kind: 'diet' as const, key, label })),
  ];
}

// --- Preferences ---------------------------------------------------------------

/** Preferences are always derived from evidence, so removal recomputes cleanly. */
export function prefsFor(b: MockBackend, userId: string): Map<string, PrefState> {
  const grouped = new Map<string, EvidenceRow[]>();
  for (const ev of b.db.evidence) {
    if (ev.userId !== userId) continue;
    const id = prefId(ev.prefType, ev.key);
    grouped.set(id, [...(grouped.get(id) ?? []), ev]);
  }
  const prefs = new Map<string, PrefState>();
  for (const [id, evs] of grouped) prefs.set(id, replayEvidence(evs));
  return prefs;
}

const encodePrefId = (prefType: PrefType, key: string) => `${prefType}.${key}`;
function decodePrefId(id: string): { prefType: PrefType; key: string } {
  const [prefType, ...rest] = id.split('.');
  if (!prefType || !['ingredient', 'flavor', 'cuisine'].includes(prefType) || rest.length === 0) {
    throw notFound('Preference not found');
  }
  return { prefType: prefType as PrefType, key: rest.join('.') };
}

function toPreference(prefType: PrefType, key: string, state: PrefState): Preference {
  return {
    id: encodePrefId(prefType, key),
    prefType,
    key,
    label: prefLabel(prefType, key),
    value: state.value,
    confidence: state.confidence,
    evidenceCount: state.evidenceCount,
    explicit: state.explicit,
    updatedAt: state.updatedAt,
  };
}

export function addEvidence(
  b: MockBackend,
  rows: Array<Omit<EvidenceRow, 'id' | 'createdAt'> & { createdAt?: string }>,
) {
  for (const row of rows) {
    b.db.evidence.push({ ...row, id: newId('ev'), createdAt: row.createdAt ?? b.nowIso() });
  }
}

export function tasteProfile(b: MockBackend, userId: string): TasteProfile {
  const prefs = [...prefsFor(b, userId)]
    .map(([id, state]) => {
      const [prefType, key] = id.split(':') as [PrefType, string];
      return toPreference(prefType, key, state);
    })
    .sort((a, b2) => Math.abs(b2.value) * b2.confidence - Math.abs(a.value) * a.confidence);
  return {
    preferences: prefs,
    constraints: userConstraints(b, userId).map(toHardConstraint),
    stats: {
      explicitCount: prefs.filter((p) => p.explicit).length,
      inferredCount: prefs.filter((p) => !p.explicit).length,
      evidenceCount: b.db.evidence.filter((e) => e.userId === userId).length,
    },
  };
}

export function preferenceDetail(b: MockBackend, userId: string, id: string): PreferenceDetail {
  const { prefType, key } = decodePrefId(id);
  const evidence = b.db.evidence
    .filter((e) => e.userId === userId && e.prefType === prefType && e.key === key)
    .sort((a, c) => c.createdAt.localeCompare(a.createdAt));
  if (evidence.length === 0) throw notFound('Preference not found');
  const state = replayEvidence(evidence);
  return {
    ...toPreference(prefType, key, state),
    evidence: evidence.map((e) => ({
      id: e.id,
      kind: e.kind,
      signal: e.signal,
      description: e.description,
      sourceType: e.sourceType,
      sourceId: e.sourceId,
      createdAt: e.createdAt,
    })),
  };
}

export function setExplicitPreference(
  b: MockBackend,
  userId: string,
  input: { prefType: PrefType; key: string; sentiment: 'like' | 'dislike' },
  sourceText: string | null = null,
  at?: string,
) {
  const label = prefLabel(input.prefType, input.key);
  addEvidence(b, [
    {
      userId,
      prefType: input.prefType,
      key: input.key,
      kind: 'statement',
      signal: input.sentiment === 'like' ? 1 : -1,
      explicit: true,
      description: sourceText
        ? `You said: "${sourceText}"`
        : `You marked ${label.toLowerCase()} as a ${input.sentiment}`,
      sourceType: 'statement',
      sourceId: null,
      createdAt: at,
    },
  ]);
}

/** Remove what the user *said* about a preference; behavioral evidence stays. */
export function removeExplicitPreference(b: MockBackend, userId: string, id: string) {
  const { prefType, key } = decodePrefId(id);
  const before = b.db.evidence.length;
  b.db.evidence = b.db.evidence.filter(
    (e) => !(e.userId === userId && e.prefType === prefType && e.key === key && e.explicit),
  );
  if (b.db.evidence.length === before) {
    // Nothing explicit: clear the inferred signal entirely.
    b.db.evidence = b.db.evidence.filter(
      (e) => !(e.userId === userId && e.prefType === prefType && e.key === key),
    );
  }
}

export function parse(text: string): StatementParse {
  return parseStatement(text);
}

/** Apply a natural-language statement: constraints and explicit preferences. */
export function applyStatement(b: MockBackend, userId: string, text: string, at?: string) {
  userById(b, userId);
  const parsed = parseStatement(text);
  for (const c of parsed.constraints) {
    addConstraint(b, userId, {
      kind: c.kind,
      key: c.key,
      source: 'statement',
      sourceText: text.trim(),
    });
  }
  for (const p of parsed.preferences) {
    setExplicitPreference(
      b,
      userId,
      { prefType: p.prefType, key: p.key, sentiment: p.sentiment },
      text.trim(),
      at,
    );
  }
  return parsed;
}
