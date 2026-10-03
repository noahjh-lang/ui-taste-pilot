'use client';

import { scoreToPercent } from '@tastepilot/shared';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  SafetyBadge,
  Skeleton,
} from '@tastepilot/ui';
import { Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { QueryState } from '@/components/query-state';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/**
 * Restaurant suggestions. Dishes are scored with the same taste ranking as
 * recipes and checked by the same tri-state safety engine. Suggestion only:
 * no ordering or booking.
 */
export function RestaurantsView() {
  const recs = useQuery({
    queryKey: queryKeys.restaurants,
    queryFn: ({ signal }) => api.restaurants.recommendations(signal),
  });
  return (
    <>
      <PageHeader
        title="Restaurants"
        description="Places that fit your taste, with every dish checked against your allergies and diet."
      />
      <p className="mb-6 flex gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Menus change. A dish marked unverified has ingredients we can’t confirm, so ask the
        restaurant before ordering.
      </p>
      <QueryState
        query={recs}
        loading={<Skeleton className="h-64 w-full" />}
        errorTitle="Couldn’t load restaurant suggestions"
      >
        {(list) =>
          list.length === 0 ? (
            <EmptyState title="No restaurants yet" />
          ) : (
            <div className="space-y-6">
              {list.map(({ restaurant: r, dishes, matchScore, safeDishCount }) => (
                <Card key={r.id}>
                  <CardHeader
                    title={
                      <span className="flex items-center gap-2">
                        <span aria-hidden>{r.emoji}</span> {r.name}
                      </span>
                    }
                    description={
                      <span className="capitalize">
                        {r.cuisine} · {r.neighborhood} · {'$'.repeat(r.priceLevel)}
                      </span>
                    }
                    action={
                      <div className="flex flex-wrap gap-2">
                        {matchScore > -1 && (
                          <Badge tone="brand">{scoreToPercent(matchScore)}% match</Badge>
                        )}
                        <Badge tone="outline">{safeDishCount} verified safe dishes</Badge>
                      </div>
                    }
                  />
                  <ul className="divide-y divide-border">
                    {dishes.map(({ dish, safety, score }) => (
                      <li
                        key={dish.id}
                        className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 sm:px-5"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            {dish.name}{' '}
                            <span className="font-normal text-muted-foreground">{dish.price}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">{dish.description}</p>
                          {safety.reasons.length > 0 && (
                            <p className="mt-1 text-xs">
                              {safety.reasons
                                .map((x) =>
                                  x.kind === 'conflict'
                                    ? `${x.ingredient}: ${x.constraintLabel}`
                                    : `${x.ingredient}: unverified`,
                                )
                                .join(' · ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {scoreToPercent(score.total)}%
                          </span>
                          <SafetyBadge size="sm" status={safety.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )
        }
      </QueryState>
    </>
  );
}
