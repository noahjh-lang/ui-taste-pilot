'use client';

import type { Feed } from '@tastepilot/api-client';
import { EmptyState, PageHeader, Skeleton } from '@tastepilot/ui';
import Link from 'next/link';
import { QueryState } from '@/components/query-state';
import { useDiscover, useHomeFeed } from '../api/queries';
import { RankedRecipeGrid, RecipeGridSkeleton } from './recipe-list';

function FeedSections({ feed, surface }: { feed: Feed; surface: string }) {
  if (feed.sections.length === 0) {
    return (
      <EmptyState
        icon="🍽️"
        title="Nothing to recommend yet"
        description="Tell us what you like on your profile, or log a meal, and recommendations will appear here."
        action={
          <Link href="/profile" className="font-medium text-brand underline">
            Set up your taste profile
          </Link>
        }
      />
    );
  }
  return (
    <div className="space-y-10">
      {feed.sections.map((section) => (
        <section key={section.key} aria-labelledby={`section-${section.key}`}>
          <h2 id={`section-${section.key}`} className="text-lg font-semibold">
            {section.title}
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">{section.subtitle}</p>
          <RankedRecipeGrid items={section.items} surface={`${surface}:${section.key}`} />
        </section>
      ))}
    </div>
  );
}

const loading = (
  <div className="space-y-4">
    <Skeleton className="h-6 w-48" />
    <RecipeGridSkeleton />
  </div>
);

export function HomeFeedView({ name }: { name: string }) {
  const feed = useHomeFeed();
  return (
    <>
      <PageHeader
        title={`Hi ${name.split(' ')[0]}, what are we cooking?`}
        description="Ranked by your taste profile. Anything that conflicts with your allergies or diet is never recommended."
      />
      <QueryState query={feed} loading={loading} errorTitle="Couldn’t load your recommendations">
        {(data) => <FeedSections feed={data} surface="home" />}
      </QueryState>
    </>
  );
}

export function DiscoverView() {
  const feed = useDiscover();
  return (
    <>
      <PageHeader
        title="Discover"
        description="What’s popular in the community, ordered by how well it fits you."
      />
      <QueryState query={feed} loading={loading} errorTitle="Couldn’t load discovery">
        {(data) => <FeedSections feed={data} surface="discover" />}
      </QueryState>
    </>
  );
}
