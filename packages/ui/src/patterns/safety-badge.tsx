import { getSafetyDisplay, resolveSafetyStatus, type SafetyStatus } from '@tastepilot/shared';
import { cn } from '../cn';

const STYLES: Record<SafetyStatus, string> = {
  safe: 'bg-safety-safe-bg text-safety-safe-fg border-safety-safe-fg/30',
  conflict: 'bg-safety-conflict-bg text-safety-conflict-fg border-safety-conflict-fg/30',
  unverified: 'bg-safety-unverified-bg text-safety-unverified-fg border-safety-unverified-fg/30',
};

function SafetyIcon({ status }: { status: SafetyStatus }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (status) {
    case 'safe':
      return (
        <svg {...common}>
          <path d="M3 8.5l3 3 7-7" />
        </svg>
      );
    case 'conflict':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" />
          <path d="M4 4l8 8" />
        </svg>
      );
    case 'unverified':
      return (
        <svg {...common}>
          <path d="M8 2l6.5 11.5h-13z" />
          <path d="M8 6.5v3M8 11.5v.01" />
        </svg>
      );
  }
}

export interface SafetyBadgeProps {
  /** The status the server returned. `null`/`undefined` means "no result". */
  status: SafetyStatus | null | undefined;
  /** The safety query is still in flight. */
  pending?: boolean;
  /** The safety query failed. */
  error?: boolean;
  /** Shown as a retry affordance when `error` is true. */
  onRetry?: () => void;
  className?: string;
}

/**
 * The single shared safety display. Never re-implement this per feature.
 * Missing, loading, or failed results always render as `unverified`.
 */
export function SafetyBadge({ status, pending, error, onRetry, className }: SafetyBadgeProps) {
  const resolved = resolveSafetyStatus(status, { pending, error });
  const display = getSafetyDisplay(resolved);

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        role="status"
        data-safety-status={resolved}
        title={display.description}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
          STYLES[resolved],
        )}
      >
        <SafetyIcon status={resolved} />
        {display.label}
        {pending && <span className="sr-only">(checking)</span>}
      </span>
      {error && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 text-xs font-medium underline underline-offset-2"
        >
          Retry safety check
        </button>
      )}
    </span>
  );
}
