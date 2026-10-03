import type { SafetyStatus } from '@tastepilot/shared';
import { cn } from '../cn';
import { SafetyIcon } from './safety-badge';

export interface SafetyReasonItem {
  kind: 'conflict' | 'unmapped_ingredient';
  ingredient: string;
  constraintLabel: string | null;
  memberName: string | null;
}

/**
 * Explains a safety result line by line, so every exclusion is traceable to
 * the ingredient and constraint behind it.
 */
export function SafetyReasons({
  status,
  reasons,
  subject = 'you',
  className,
}: {
  status: SafetyStatus;
  reasons: SafetyReasonItem[];
  subject?: string;
  className?: string;
}) {
  const conflicts = reasons.filter((r) => r.kind === 'conflict');
  const unmapped = reasons.filter((r) => r.kind === 'unmapped_ingredient');

  if (status === 'safe') {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        Every ingredient is in our verified data and none conflict with{' '}
        {subject === 'you' ? 'your' : `${subject}'s`} allergies or diet.
      </p>
    );
  }

  return (
    <ul className={cn('space-y-1.5 text-sm', className)}>
      {conflicts.map((r, i) => (
        <li key={`c${i}`} className="flex gap-2">
          <SafetyIcon status="conflict" className="mt-0.5 shrink-0 text-safety-conflict-fg" />
          <span>
            <strong>{r.ingredient}</strong> conflicts with{' '}
            {r.memberName ? `${r.memberName}'s` : 'your'} <strong>{r.constraintLabel}</strong>{' '}
            constraint.
          </span>
        </li>
      ))}
      {unmapped.map((r, i) => (
        <li key={`u${i}`} className="flex gap-2">
          <SafetyIcon status="unverified" className="mt-0.5 shrink-0 text-safety-unverified-fg" />
          <span>
            <strong>{r.ingredient}</strong> isn’t in our verified ingredient data, so we can’t
            confirm it’s safe. Check the label.
          </span>
        </li>
      ))}
    </ul>
  );
}
