import { CUISINES, FLAVORS, ingredientByKey } from '../data/ingredients';

export type PrefType = 'ingredient' | 'flavor' | 'cuisine';

export interface EvidenceInput {
  prefType: PrefType;
  key: string;
  /** -1..1 */
  signal: number;
  explicit: boolean;
  createdAt: string;
}

export interface PrefState {
  value: number;
  confidence: number;
  evidenceCount: number;
  explicit: boolean;
  updatedAt: string;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n * 1000) / 1000;

export const EMPTY_PREF: PrefState = {
  value: 0,
  confidence: 0,
  evidenceCount: 0,
  explicit: false,
  updatedAt: '',
};

/**
 * Apply one piece of evidence to a preference.
 *
 * - Explicit statements move the value strongly toward the stated sentiment
 *   and raise confidence immediately.
 * - Inferred signals move it gradually, with a shrinking step as evidence
 *   accumulates, and are damped when they would erode a confident explicit
 *   preference.
 */
export function applyEvidence(state: PrefState, evidence: EvidenceInput): PrefState {
  const target = clamp(evidence.signal, -1, 1);
  if (evidence.explicit) {
    return {
      value: round(clamp(state.value + 0.8 * (target - state.value), -1, 1)),
      confidence: round(clamp(Math.max(state.confidence, 0.85) + 0.05, 0, 1)),
      evidenceCount: state.evidenceCount + 1,
      explicit: true,
      updatedAt: evidence.createdAt,
    };
  }

  let step = 0.3 / (1 + 0.35 * state.evidenceCount);
  const opposes = Math.sign(target) !== 0 && Math.sign(target) !== Math.sign(state.value);
  if (state.explicit && state.confidence >= 0.7 && opposes) step *= 0.2;

  const confidenceCap = state.explicit ? 1 : 0.8;
  return {
    value: round(clamp(state.value + step * (target - state.value), -1, 1)),
    confidence: round(
      clamp(state.confidence + 0.12 / (1 + 0.25 * state.evidenceCount), 0, confidenceCap),
    ),
    evidenceCount: state.evidenceCount + 1,
    explicit: state.explicit,
    updatedAt: evidence.createdAt,
  };
}

/** Rebuild a preference from scratch, e.g. after evidence is removed. */
export function replayEvidence(evidence: EvidenceInput[]): PrefState {
  return [...evidence]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .reduce(applyEvidence, EMPTY_PREF);
}

export function prefLabel(prefType: PrefType, key: string) {
  const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  if (prefType === 'ingredient')
    return title(ingredientByKey(key)?.label ?? key.replace(/_/g, ' '));
  if (prefType === 'cuisine' && CUISINES.includes(key)) return title(key);
  if (prefType === 'flavor' && FLAVORS.includes(key)) return title(key);
  return title(key);
}

export const RATING_SIGNAL = { liked: 1, neutral: 0.3, disliked: -1 } as const;
