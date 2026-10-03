'use client';

import type { PublicProfile, RecipePostInput } from '@tastepilot/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { track } from '@/lib/events';
import { queryKeys } from '@/lib/query-keys';

export const useCookbook = (filter: 'all' | 'following' | 'mine') =>
  useQuery({
    queryKey: queryKeys.cookbook(filter),
    queryFn: ({ signal }) => api.community.cookbook(filter, signal),
  });

export const usePosts = (recipeId: string) =>
  useQuery({
    queryKey: queryKeys.recipePosts(recipeId),
    queryFn: ({ signal }) => api.community.posts(recipeId, signal),
  });

export function useCreatePost(recipeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecipePostInput) => api.community.createPost(recipeId, input),
    onSuccess: (post) => {
      track('recipe_post_created', { kind: post.kind, mentions: post.mentions.length });
      void qc.invalidateQueries({ queryKey: queryKeys.recipePosts(recipeId) });
      // Ratings feed the recipe's popularity; safety is unaffected by reviews.
      void qc.invalidateQueries({ queryKey: queryKeys.recipe(recipeId) });
    },
  });
}

export const useProfile = (handle: string) =>
  useQuery({
    queryKey: queryKeys.user(handle),
    queryFn: ({ signal }) => api.community.profile(handle, signal),
  });

export const useUserRecipes = (handle: string) =>
  useQuery({
    queryKey: queryKeys.userRecipes(handle),
    queryFn: ({ signal }) => api.community.userRecipes(handle, signal),
  });

export const useMentions = () =>
  useQuery({
    queryKey: queryKeys.mentions,
    queryFn: ({ signal }) => api.community.mentions(signal),
  });

/** Following is low-stakes: optimistic. */
export function useFollow(handle: string) {
  const qc = useQueryClient();
  const key = queryKeys.user(handle);
  return useMutation({
    mutationFn: (follow: boolean) =>
      follow ? api.community.follow(handle) : api.community.unfollow(handle),
    onMutate: async (follow) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<PublicProfile>(key);
      qc.setQueryData<PublicProfile>(key, (old) =>
        old ? { ...old, isFollowing: follow, followers: old.followers + (follow ? 1 : -1) } : old,
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(key, ctx.previous),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ['cookbook'] });
      void qc.invalidateQueries({ queryKey: queryKeys.discover });
    },
  });
}
