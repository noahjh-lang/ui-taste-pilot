'use client';

import type { Party } from '@tastepilot/api-client';
import { formatRelativeDate } from '@tastepilot/shared';
import { Avatar, Badge, Card, CardHeader, ErrorState, SafetyBadge, Skeleton } from '@tastepilot/ui';
import { useEffect } from 'react';
import { track } from '@/lib/events';
import { errorMessage } from '@/lib/query-client';
import { useSafetySummary } from '../api/queries';

/**
 * Host view of every allergy and diet in the group, merged. It comes from the
 * same server data that drives exclusion. While it loads or fails we say so
 * explicitly: never a blank that reads as "nothing to worry about".
 */
export function SafetySummaryCard({ partyId }: { partyId: string }) {
  const summary = useSafetySummary(partyId);
  useEffect(() => {
    if (summary.isSuccess)
      track('party_safety_summary_viewed', { exclusions: summary.data.exclusions.length }, partyId);
    // Only once per successful load of this party.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary.isSuccess, partyId]);

  return (
    <Card>
      <CardHeader
        title="Group safety summary"
        description="Anything that conflicts with one of these is excluded for the whole party."
        action={
          summary.data ? (
            <span className="text-xs text-muted-foreground">
              Updated {formatRelativeDate(summary.data.updatedAt)}
            </span>
          ) : undefined
        }
      />
      <div className="p-4 sm:p-5">
        {summary.isPending ? (
          <div className="space-y-3" aria-busy="true">
            <div className="flex items-center gap-2 text-sm">
              <SafetyBadge status={null} pending />
              <span className="text-muted-foreground">
                Loading the group’s allergies and diets…
              </span>
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ) : summary.isError ? (
          <div className="space-y-3">
            <SafetyBadge status={null} error onRetry={() => void summary.refetch()} />
            <ErrorState
              title="Couldn’t load the group’s allergies"
              message={`${errorMessage(summary.error)} Until this loads, treat every dish as unverified.`}
            />
          </div>
        ) : summary.data.exclusions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nobody in the party has allergies or dietary restrictions on file.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {summary.data.exclusions.map((x) => (
                <li
                  key={`${x.kind}:${x.key}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{x.label}</span>
                    <Badge tone="outline">{x.kind === 'allergy' ? 'Allergy' : 'Diet'}</Badge>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {x.members.map((m) => m.name).join(', ')}
                  </span>
                </li>
              ))}
            </ul>
            {summary.data.membersWithoutConstraints.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                No restrictions on file:{' '}
                {summary.data.membersWithoutConstraints.map((m) => m.name).join(', ')}.
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

/** "Who's eating": a scannable table on larger screens, a stacked list on mobile. */
export function MembersCard({ party, myId }: { party: Party; myId: string }) {
  const constraintText = (m: Party['members'][number]) =>
    m.constraints.length ? m.constraints.map((c) => c.label).join(', ') : 'None on file';
  return (
    <Card>
      <CardHeader title={`Who’s eating (${party.members.length})`} />
      <table className="hidden w-full text-sm md:table">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-5 py-2 font-medium">
              Name
            </th>
            <th scope="col" className="px-2 py-2 font-medium">
              Allergies & diets
            </th>
            <th scope="col" className="px-5 py-2 font-medium">
              Taste data
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {party.members.map((m) => (
            <tr key={m.userId}>
              <th scope="row" className="px-5 py-2.5 text-left font-medium">
                <span className="flex items-center gap-2">
                  <Avatar name={m.name} color={m.avatarColor} size="sm" />
                  {m.name}
                  {m.userId === myId && <span className="text-muted-foreground">(you)</span>}
                  {m.role === 'host' && <Badge tone="brand">Host</Badge>}
                  {m.kind === 'lite' && <Badge tone="outline">Guest</Badge>}
                </span>
              </th>
              <td className="px-2 py-2.5">{constraintText(m)}</td>
              <td className="px-5 py-2.5 text-muted-foreground">
                {m.sharesTaste ? 'Shared' : 'Private'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-border md:hidden">
        {party.members.map((m) => (
          <li key={m.userId} className="flex gap-3 px-4 py-3">
            <Avatar name={m.name} color={m.avatarColor} size="sm" />
            <div className="min-w-0 text-sm">
              <p className="flex flex-wrap items-center gap-1.5 font-medium">
                {m.name}
                {m.userId === myId && <span className="text-muted-foreground">(you)</span>}
                {m.role === 'host' && <Badge tone="brand">Host</Badge>}
                {m.kind === 'lite' && <Badge tone="outline">Guest</Badge>}
              </p>
              <p>{constraintText(m)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
