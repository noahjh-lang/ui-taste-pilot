import { create } from 'zustand';

/**
 * Cross-feature UI state. Server data never lives here (that's TanStack
 * Query); only client concerns that more than one feature needs.
 */
interface ActivePartyState {
  /** The Meal Party the user is currently planning, e.g. for "add to potluck". */
  activePartyId: string | null;
  setActiveParty: (id: string | null) => void;
}

export const useActiveParty = create<ActivePartyState>((set) => ({
  activePartyId: null,
  setActiveParty: (activePartyId) => set({ activePartyId }),
}));

interface ClaimPromptState {
  dismissed: boolean;
  dismiss: () => void;
}

/** The lite-account "Save your profile" prompt stays dismissed for the tab. */
export const useClaimPrompt = create<ClaimPromptState>((set) => ({
  dismissed: false,
  dismiss: () => set({ dismissed: true }),
}));
