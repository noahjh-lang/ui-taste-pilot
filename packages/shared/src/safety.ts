/**
 * Framework-agnostic safety display logic.
 *
 * The server is the only safety authority. Nothing here derives a status from
 * ingredient or allergy data -- it only decides how to *display* a status the
 * API returned, and what to show when there is no such status.
 */

export const SAFETY_STATUSES = ['safe', 'conflict', 'unverified'] as const;

export type SafetyStatus = (typeof SAFETY_STATUSES)[number];

export interface SafetyDisplay {
  status: SafetyStatus;
  label: string;
  description: string;
}

const DISPLAY: Record<SafetyStatus, Omit<SafetyDisplay, 'status'>> = {
  safe: {
    label: 'Safe',
    description: 'Checked against your allergies and dietary restrictions.',
  },
  conflict: {
    label: 'Conflict',
    description: 'Contains something that conflicts with an allergy or restriction.',
  },
  unverified: {
    label: 'Unverified',
    description: 'Safety could not be confirmed. Do not assume this is safe.',
  },
};

/**
 * Resolve what to display for a safety result that may be missing, loading,
 * or failed. Anything other than a status the server actually returned
 * resolves to `unverified` -- never `safe`.
 */
export function resolveSafetyStatus(
  status: SafetyStatus | null | undefined,
  options: { pending?: boolean; error?: boolean } = {},
): SafetyStatus {
  if (options.pending || options.error || status == null) {
    return 'unverified';
  }
  return status;
}

export function getSafetyDisplay(status: SafetyStatus): SafetyDisplay {
  return { status, ...DISPLAY[status] };
}
