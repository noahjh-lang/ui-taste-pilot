'use client';

import { Button, Dialog, Select, toast } from '@tastepilot/ui';
import { HandPlatter } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/query-client';
import { useActiveParty } from '@/lib/stores';
import { useParties } from '../api/queries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

/** Offer a recipe to a party's potluck. Defaults to the party you were last planning. */
export function AddToPotluckButton({ recipeId, title }: { recipeId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const activePartyId = useActiveParty((s) => s.activePartyId);
  const parties = useParties();
  const [partyId, setPartyId] = useState<string>('');
  const [pending, setPending] = useState(false);
  const qc = useQueryClient();
  const options = parties.data ?? [];
  const selected = partyId || activePartyId || options[0]?.id || '';

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="sm" variant="secondary">
          <HandPlatter className="size-4" aria-hidden /> Bring to a party
        </Button>
      }
      title="Bring this to a Meal Party"
      description="We’ll check it against everyone in the party."
      footer={
        <Button
          disabled={!selected}
          loading={pending}
          onClick={async () => {
            setPending(true);
            try {
              const c = await api.parties.proposeContribution(selected, {
                dishName: title,
                recipeId,
                ingredients: [],
                course: 'main',
              });
              await qc.invalidateQueries({ queryKey: queryKeys.partyContributions(selected) });
              setOpen(false);
              toast(
                'Added to the potluck',
                c.safety.status === 'safe'
                  ? 'Safe for everyone.'
                  : c.safety.status === 'conflict'
                    ? `Heads up: conflicts with ${[...new Set(c.safety.conflicts.map((x) => x.memberName))].join(', ')}.`
                    : 'Some ingredients couldn’t be verified.',
              );
            } catch (e) {
              toast('Couldn’t add it', errorMessage(e));
            } finally {
              setPending(false);
            }
          }}
        >
          Add to potluck
        </Button>
      }
    >
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">You’re not in any Meal Parties yet.</p>
      ) : (
        <>
          <label htmlFor="potluck-party" className="text-sm font-medium">
            Party
          </label>
          <Select
            id="potluck-party"
            className="mt-1.5"
            value={selected}
            onChange={(e) => setPartyId(e.target.value)}
          >
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </>
      )}
    </Dialog>
  );
}
