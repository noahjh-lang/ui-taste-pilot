'use client';

import { Badge, Button, Checkbox, EmptyState, Input, PageHeader, Select } from '@tastepilot/ui';
import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { QueryState } from '@/components/query-state';
import { useSearch, useTags } from '../api/queries';
import { RankedRecipeGrid, RecipeGridSkeleton } from './recipe-list';

function SearchBox({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [draft, setDraft] = useState(initial);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(draft.trim());
      }}
      className="mb-4 flex gap-2"
    >
      <label htmlFor="search-q" className="sr-only">
        Search recipes
      </label>
      <Input
        id="search-q"
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Try “curry”, “tacos” or “quick”"
      />
      <Button type="submit">
        <Search className="size-4" aria-hidden />
        Search
      </Button>
    </form>
  );
}

/** Search state lives in the URL so results are linkable and back-button friendly. */
export function SearchView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const tags = params.getAll('tag');
  const maxTime = params.get('maxTime') ? Number(params.get('maxTime')) : null;
  const hideConflicts = params.get('showConflicts') !== '1';

  const update = (changes: Record<string, string | string[] | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      next.delete(key);
      if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
      else if (value) next.set(key, value);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const results = useSearch({ q, tags, maxTime, hideConflicts });
  const allTags = useTags();

  return (
    <>
      <PageHeader
        title="Search"
        description="Results are ranked by the same taste model as your home feed."
      />
      {/* Keyed by the URL query so back/forward resets the box without an effect. */}
      <SearchBox key={q} initial={q} onSearch={(value) => update({ q: value || null })} />

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <label htmlFor="max-time" className="text-sm">
            Max time
          </label>
          <Select
            id="max-time"
            className="w-36"
            value={maxTime ?? ''}
            onChange={(e) => update({ maxTime: e.target.value || null })}
          >
            <option value="">Any</option>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">1 hour</option>
          </Select>
        </div>
        <Checkbox
          label="Hide recipes that conflict with my allergies or diet"
          checked={hideConflicts}
          onChange={(e) => update({ showConflicts: e.target.checked ? null : '1' })}
        />
      </div>

      {allTags.data && (
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
          {allTags.data.map((tag) => {
            const active = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  update({ tag: active ? tags.filter((t) => t !== tag) : [...tags, tag] })
                }
                className="min-h-9 rounded-full border border-border px-3 text-sm aria-pressed:border-brand aria-pressed:bg-brand/10 aria-pressed:font-medium"
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      <QueryState query={results} loading={<RecipeGridSkeleton />} errorTitle="Search failed">
        {(data) => (
          <div aria-live="polite">
            <p className="mb-3 text-sm text-muted-foreground">
              {data.results.length} {data.results.length === 1 ? 'recipe' : 'recipes'}
              {data.query && <> for “{data.query}”</>}
              {data.hiddenConflicts > 0 && (
                <>
                  {' · '}
                  <Badge tone="outline">
                    {data.hiddenConflicts} hidden: conflict with your constraints
                  </Badge>{' '}
                  <button
                    type="button"
                    className="font-medium underline"
                    onClick={() => update({ showConflicts: '1' })}
                  >
                    Show them
                  </button>
                </>
              )}
            </p>
            {data.results.length === 0 ? (
              <EmptyState
                icon="🔎"
                title={data.hiddenConflicts ? 'Only conflicting recipes match' : 'No recipes match'}
                description={
                  data.hiddenConflicts
                    ? 'Everything that matches conflicts with your allergies or diet.'
                    : 'Try fewer filters or a different word.'
                }
              />
            ) : (
              <RankedRecipeGrid items={data.results} surface="search" />
            )}
          </div>
        )}
      </QueryState>
    </>
  );
}
