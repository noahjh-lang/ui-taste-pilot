'use client';

import type { Me } from '@tastepilot/api-client';
import { formatDate } from '@tastepilot/shared';
import { Badge, Card, CardHeader, PageHeader, Skeleton } from '@tastepilot/ui';
import { CalendarDays } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { QueryState } from '@/components/query-state';
import { useActiveParty } from '@/lib/stores';
import { useGroupRecommendations, useParty } from '../api/queries';
import { DuplicateHint } from './duplicate-hint';
import { GroupRecommendationsCard } from './group-recommendations';
import { InviteLinksCard } from './invite-links';
import { PotluckCard } from './potluck';
import { MembersCard, SafetySummaryCard } from './safety-summary';

/**
 * The Meal Party dashboard. Hosts get invite management; everyone sees the
 * safety summary, potluck and group recipes. `myDietaryNeeds` lets the page
 * compose in the profile feature's editor for the current member.
 */
export function PartyView({
  id,
  user,
  banner,
  myDietaryNeeds,
}: {
  id: string;
  user: Me;
  banner?: ReactNode;
  myDietaryNeeds: ReactNode;
}) {
  const party = useParty(id);
  const recs = useGroupRecommendations(id);
  const setActiveParty = useActiveParty((s) => s.setActiveParty);
  useEffect(() => setActiveParty(id), [id, setActiveParty]);

  return (
    <QueryState
      query={party}
      errorTitle="Couldn’t open this party"
      loading={
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      }
    >
      {(p) => {
        const isHost = p.hostId === user.id;
        return (
          <>
            <DuplicateHint partyId={id} />
            {banner}
            <PageHeader
              title={p.name}
              description={
                <span className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-4" aria-hidden /> {formatDate(p.date)}
                  </span>
                  · Hosted by {p.hostName}
                  {isHost && <Badge tone="brand">You’re hosting</Badge>}
                </span>
              }
            />
            {p.description && <p className="-mt-3 mb-6 max-w-2xl text-sm">{p.description}</p>}
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-6">
                <SafetySummaryCard partyId={id} />
                <MembersCard party={p} myId={user.id} />
                <Card>
                  <CardHeader
                    title="Your dietary needs"
                    description="The host and the safety checks use these for this party."
                  />
                  <div className="p-4 sm:p-5">{myDietaryNeeds}</div>
                </Card>
                {isHost && <InviteLinksCard partyId={id} />}
              </div>
              <div className="space-y-6">
                <PotluckCard
                  partyId={id}
                  myId={user.id}
                  isHost={isHost}
                  recipes={recs.data?.results ?? []}
                />
                <GroupRecommendationsCard
                  query={recs}
                  canOpenRecipes={user.kind === 'full'}
                  partyId={id}
                />
              </div>
            </div>
          </>
        );
      }}
    </QueryState>
  );
}
