'use client';

import { Badge, Skeleton } from '@tastepilot/ui';
import { QueryState } from '@/components/query-state';
import { useTasteProfile } from '../api/queries';
import { StatementBox } from './statement-box';

/** Compact view + editor of the current user's constraints (e.g. for guests in a party). */
export function DietaryNeedsEditor() {
  const profile = useTasteProfile();
  return (
    <div className="space-y-4">
      <QueryState query={profile} loading={<Skeleton className="h-8 w-full" />}>
        {(p) =>
          p.constraints.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven’t told us about any allergies or diets.
            </p>
          ) : (
            <p className="flex flex-wrap gap-1.5">
              {p.constraints.map((c) => (
                <Badge key={c.id} tone="brand">
                  {c.label}
                </Badge>
              ))}
            </p>
          )
        }
      </QueryState>
      <StatementBox />
    </div>
  );
}
