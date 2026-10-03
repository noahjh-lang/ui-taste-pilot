'use client';

import type {
  AcceptInviteInput,
  CreateInviteInput,
  CreatePartyInput,
  PotluckContribution,
  ProposeContributionInput,
} from '@tastepilot/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { track } from '@/lib/events';
import { queryKeys } from '@/lib/query-keys';

/** Near-real-time for v1: short-interval polling of the open party. */
const POLL_MS = 10_000;

export const useParties = () =>
  useQuery({ queryKey: queryKeys.parties, queryFn: ({ signal }) => api.parties.list(signal) });

export function useCreateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePartyInput) => api.parties.create(input),
    onSuccess: (party) => {
      qc.setQueryData(queryKeys.party(party.id), party);
      void qc.invalidateQueries({ queryKey: queryKeys.parties });
      track('party_created', {}, party.id);
    },
  });
}

/**
 * The open party, polled. When membership changes, the safety picture may have
 * changed too, so the safety summary (and everything derived from it) is
 * refetched immediately rather than waiting for the next poll.
 */
export function useParty(id: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.party(id),
    queryFn: ({ signal }) => api.parties.get(id, signal),
    refetchInterval: POLL_MS,
  });
  const memberKey = query.data?.members.map((m) => `${m.userId}:${m.constraints.length}`).join(',');
  const previous = useRef(memberKey);
  useEffect(() => {
    if (
      previous.current !== undefined &&
      memberKey !== undefined &&
      previous.current !== memberKey
    ) {
      void qc.invalidateQueries({ queryKey: queryKeys.partySafety(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.partyContributions(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.partyRecommendations(id) });
    }
    previous.current = memberKey;
  }, [memberKey, id, qc]);
  return query;
}

export const useSafetySummary = (id: string) =>
  useQuery({
    queryKey: queryKeys.partySafety(id),
    queryFn: ({ signal }) => api.parties.safetySummary(id, signal),
    refetchInterval: POLL_MS,
  });

export const useInvites = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.partyInvites(id),
    queryFn: ({ signal }) => api.parties.invites(id, signal),
    enabled,
    refetchInterval: POLL_MS,
  });

export function useCreateInvite(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInviteInput) => api.parties.createInvite(id, input),
    onSuccess: () => {
      track('invite_link_created', {}, id);
      return qc.invalidateQueries({ queryKey: queryKeys.partyInvites(id) });
    },
  });
}

export function useRevokeInvite(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => api.parties.revokeInvite(id, inviteId),
    onSuccess: () => {
      track('invite_link_revoked', {}, id);
      return qc.invalidateQueries({ queryKey: queryKeys.partyInvites(id) });
    },
  });
}

export const useContributions = (id: string) =>
  useQuery({
    queryKey: queryKeys.partyContributions(id),
    queryFn: ({ signal }) => api.parties.contributions(id, signal),
    refetchInterval: POLL_MS,
  });

/** Proposing a dish touches safety: no optimistic insert, we show the server's check. */
export function usePropose(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProposeContributionInput) => api.parties.proposeContribution(id, input),
    onSuccess: (c) => {
      track('potluck_proposed', { safety: c.safety.status }, id);
      return qc.invalidateQueries({ queryKey: queryKeys.partyContributions(id) });
    },
  });
}

/** Claiming / marking as brought is low-stakes: optimistic with a pending state. */
export function useSetContributionStatus(id: string) {
  const qc = useQueryClient();
  const key = queryKeys.partyContributions(id);
  return useMutation({
    mutationFn: ({
      contributionId,
      status,
    }: {
      contributionId: string;
      status: PotluckContribution['status'];
    }) => api.parties.setContributionStatus(id, contributionId, status),
    onMutate: async ({ contributionId, status }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<PotluckContribution[]>(key);
      qc.setQueryData<PotluckContribution[]>(key, (old) =>
        old?.map((c) => (c.id === contributionId ? { ...c, status } : c)),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(key, ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export const useGroupRecommendations = (id: string) =>
  useQuery({
    queryKey: queryKeys.partyRecommendations(id),
    queryFn: ({ signal }) => api.parties.recommendations(id, signal),
    refetchInterval: POLL_MS * 3,
  });

export const useInvitePreview = (token: string) =>
  useQuery({
    queryKey: queryKeys.invite(token),
    queryFn: ({ signal }) => api.parties.invitePreview(token, signal),
  });

export function useAcceptInvite(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AcceptInviteInput) => api.parties.acceptInvite(token, input),
    onSuccess: async (result) => {
      if (result.createdLiteAccount) track('lite_account_created', {}, result.partyId);
      track('invite_accepted', { duplicateHint: !!result.possibleDuplicateOf }, result.partyId);
      // A guest just got a session: refresh it before routing into the party.
      await qc.invalidateQueries({ queryKey: queryKeys.session });
      await qc.invalidateQueries({ queryKey: queryKeys.parties });
      await qc.invalidateQueries({ queryKey: queryKeys.party(result.partyId) });
    },
  });
}

export function useRecoverIdentity(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.parties.recoverIdentity(id, userId),
    onSuccess: (session) => {
      track('duplicate_hint_confirmed', {}, id);
      qc.clear();
      qc.setQueryData(queryKeys.session, session);
    },
  });
}
