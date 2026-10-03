'use client';

import type { RecipeDraft } from '@tastepilot/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { track } from '@/lib/events';
import { invalidateTasteDependents, queryKeys } from '@/lib/query-keys';

export const useHomeFeed = () =>
  useQuery({ queryKey: queryKeys.homeFeed, queryFn: ({ signal }) => api.recipes.homeFeed(signal) });

export const useDiscover = () =>
  useQuery({ queryKey: queryKeys.discover, queryFn: ({ signal }) => api.recipes.discover(signal) });

export interface SearchParams {
  q: string;
  tags: string[];
  maxTime: number | null;
  hideConflicts: boolean;
}

export function useSearch(params: SearchParams) {
  return useQuery({
    queryKey: queryKeys.search(params),
    queryFn: ({ signal }) => api.recipes.search(params, signal),
    placeholderData: (prev) => prev,
  });
}

export const useTags = () =>
  useQuery({
    queryKey: queryKeys.tags,
    queryFn: ({ signal }) => api.recipes.tags(signal),
    staleTime: Infinity,
  });

export const useRecipe = (id: string) =>
  useQuery({
    queryKey: queryKeys.recipe(id),
    queryFn: ({ signal }) => api.recipes.get(id, signal),
    enabled: !!id,
  });

export const useMyRecipes = () =>
  useQuery({ queryKey: queryKeys.myRecipes, queryFn: ({ signal }) => api.recipes.mine(signal) });

export const usePublicRecipe = (id: string) =>
  useQuery({
    queryKey: queryKeys.publicRecipe(id),
    queryFn: ({ signal }) => api.recipes.publicGet(id, signal),
  });

/** Prefetch on hover so the common feed -> detail path feels instant. */
export function usePrefetchRecipe() {
  const qc = useQueryClient();
  return (id: string) =>
    void qc.prefetchQuery({
      queryKey: queryKeys.recipe(id),
      queryFn: () => api.recipes.get(id),
      staleTime: 30_000,
    });
}

/** Like/dislike: low-stakes, so optimistic, then reconciled. */
export function useFeedback(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (feedback: 'like' | 'dislike' | null) => api.recipes.setFeedback(id, feedback),
    onMutate: async (feedback) => {
      await qc.cancelQueries({ queryKey: queryKeys.recipe(id) });
      const previous = qc.getQueryData(queryKeys.recipe(id));
      qc.setQueryData(
        queryKeys.recipe(id),
        (old: Awaited<ReturnType<typeof api.recipes.get>> | undefined) =>
          old ? { ...old, myFeedback: feedback } : old,
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(queryKeys.recipe(id), ctx.previous),
    onSuccess: (_d, feedback) =>
      track('recipe_feedback', { recipeId: id, feedback: feedback ?? 'cleared' }),
    onSettled: () => invalidateTasteDependents(qc),
  });
}

export function useGenerateDraft() {
  return useMutation({
    mutationFn: (input: { prompt: string; usePantry: boolean }) => api.recipes.generate(input),
    onSuccess: () => track('recipe_generated'),
  });
}

export function useSaveRecipe(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      draft,
      source,
    }: {
      draft: RecipeDraft;
      source: 'community' | 'ai_generated';
    }) => (id ? api.recipes.update(id, draft) : api.recipes.create(draft, source)),
    onSuccess: (detail) => {
      qc.setQueryData(queryKeys.recipe(detail.recipe.id), detail);
      void qc.invalidateQueries({ queryKey: queryKeys.recipes });
      void qc.invalidateQueries({ queryKey: ['safety'] });
      void qc.invalidateQueries({ queryKey: ['cookbook'] });
    },
  });
}

export function usePublish(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (published: boolean) => api.recipes.setPublished(id, published),
    onSuccess: (detail) => {
      qc.setQueryData(queryKeys.recipe(id), detail);
      void qc.invalidateQueries({ queryKey: ['cookbook'] });
      void qc.invalidateQueries({ queryKey: queryKeys.recipes });
    },
  });
}
