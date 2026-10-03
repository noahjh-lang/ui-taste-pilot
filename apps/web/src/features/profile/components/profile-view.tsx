'use client';

import type { Me, Preference } from '@tastepilot/api-client';
import { formatRelativeDate } from '@tastepilot/shared';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Dialog,
  EmptyState,
  PageHeader,
  PreferenceChip,
  Select,
  Skeleton,
  Switch,
  toast,
} from '@tastepilot/ui';
import { Download, Info, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { QueryState } from '@/components/query-state';
import { downloadJson } from '@/lib/browser';
import { errorMessage } from '@/lib/query-client';
import {
  useAddConstraint,
  useConstraintOptions,
  useDeleteData,
  useExportData,
  usePreferenceDetail,
  useRemoveConstraint,
  useRemovePreference,
  useTasteProfile,
  useUpdateSettings,
} from '../api/queries';
import { StatementBox } from './statement-box';

function ValueBar({ value }: { value: number }) {
  const pct = Math.round(Math.abs(value) * 50);
  return (
    <div className="relative h-2 w-28 rounded-full bg-muted" aria-hidden>
      <div className="absolute top-0 left-1/2 h-2 w-px bg-border" />
      <div
        className={
          value >= 0
            ? 'absolute top-0 left-1/2 h-2 rounded-r-full bg-brand'
            : 'absolute top-0 right-1/2 h-2 rounded-l-full bg-foreground/50'
        }
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function EvidenceDialog({ pref, onClose }: { pref: Preference; onClose: () => void }) {
  const detail = usePreferenceDetail(pref.id);
  const remove = useRemovePreference();
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Why we think you ${pref.value >= 0 ? 'like' : 'dislike'} ${pref.label.toLowerCase()}`}
      description={`${Math.round(pref.confidence * 100)}% confident, from ${pref.evidenceCount} piece${pref.evidenceCount === 1 ? '' : 's'} of evidence.`}
      footer={
        <Button
          variant="secondary"
          loading={remove.isPending}
          onClick={() =>
            remove.mutate(pref.id, {
              onSuccess: () => {
                toast(pref.explicit ? 'Removed what you told us' : 'Preference cleared');
                onClose();
              },
              onError: (e) => toast('Couldn’t remove it', errorMessage(e)),
            })
          }
        >
          {pref.explicit ? 'Remove what I said' : 'Clear this preference'}
        </Button>
      }
    >
      <QueryState query={detail} loading={<Skeleton className="h-24 w-full" />}>
        {(d) => (
          <ol className="space-y-2 text-sm">
            {d.evidence.map((e) => (
              <li key={e.id} className="flex gap-3 rounded-md border border-border p-2">
                <Badge tone={e.kind === 'statement' ? 'brand' : 'outline'}>
                  {e.kind === 'statement'
                    ? 'You said'
                    : e.kind === 'feedback'
                      ? 'Feedback'
                      : e.kind === 'cooked'
                        ? 'Cooked'
                        : 'Ate out'}
                </Badge>
                <span className="flex-1">{e.description}</span>
                <span className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatRelativeDate(e.createdAt)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </QueryState>
    </Dialog>
  );
}

function ConstraintsCard() {
  const profile = useTasteProfile();
  const options = useConstraintOptions();
  const add = useAddConstraint();
  const remove = useRemoveConstraint();
  const [choice, setChoice] = useState('');

  return (
    <Card>
      <CardHeader
        title="Allergies & dietary restrictions"
        description="Strict: anything that conflicts is never recommended to you, and is excluded for any Meal Party you join."
      />
      <div className="space-y-4 p-4 sm:p-5">
        <QueryState query={profile} loading={<Skeleton className="h-16 w-full" />}>
          {(p) =>
            p.constraints.length === 0 ? (
              <p className="text-sm text-muted-foreground">None on file.</p>
            ) : (
              <ul className="divide-y divide-border">
                {p.constraints.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <span className="font-medium">{c.label}</span>{' '}
                      <Badge tone="outline">{c.kind}</Badge>
                      <p className="text-xs text-muted-foreground">
                        {c.source === 'statement'
                          ? `From what you said: “${c.sourceText}”`
                          : 'Added from the list'}{' '}
                        · {formatRelativeDate(c.createdAt)}
                      </p>
                    </div>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="sm" aria-label={`Remove ${c.label}`}>
                          <Trash2 className="size-4" aria-hidden /> Remove
                        </Button>
                      }
                      title={`Remove ${c.label}?`}
                      description="Recipes containing it may be recommended to you again, and your Meal Parties will stop excluding it for you."
                      confirmLabel="Remove"
                      pending={remove.isPending}
                      onConfirm={() =>
                        remove
                          .mutateAsync(c.id)
                          .catch((e: unknown) => toast('Couldn’t remove it', errorMessage(e)))
                      }
                    />
                  </li>
                ))}
              </ul>
            )
          }
        </QueryState>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const [kind, key] = choice.split(':') as ['allergy' | 'diet', string];
            if (!key) return;
            add.mutate(
              { kind, key },
              {
                onSuccess: () => {
                  toast('Added', 'Safety checks now include it.');
                  setChoice('');
                },
                onError: (err) => toast('Couldn’t add it', errorMessage(err)),
              },
            );
          }}
        >
          <label htmlFor="add-constraint" className="sr-only">
            Add an allergy or diet
          </label>
          <Select
            id="add-constraint"
            className="max-w-xs"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
          >
            <option value="">Add from the list…</option>
            <optgroup label="Allergies">
              {options.data
                ?.filter((o) => o.kind === 'allergy')
                .map((o) => (
                  <option key={o.key} value={`allergy:${o.key}`}>
                    {o.label}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Diets">
              {options.data
                ?.filter((o) => o.kind === 'diet')
                .map((o) => (
                  <option key={o.key} value={`diet:${o.key}`}>
                    {o.label}
                  </option>
                ))}
            </optgroup>
          </Select>
          <Button type="submit" variant="secondary" disabled={!choice} loading={add.isPending}>
            Add
          </Button>
        </form>
      </div>
    </Card>
  );
}

function PreferencesCard() {
  const profile = useTasteProfile();
  const [open, setOpen] = useState<Preference | null>(null);
  return (
    <Card>
      <CardHeader
        title="What we’ve learned about your taste"
        description="Every preference is traceable to what you told us or what you ate. Select one to see why."
      />
      <div className="p-4 sm:p-5">
        <QueryState query={profile} loading={<Skeleton className="h-40 w-full" />}>
          {(p) =>
            p.preferences.length === 0 ? (
              <EmptyState
                icon="🧭"
                title="No preferences yet"
                description="Tell us what you like above, or log meals in Food history, and we’ll learn as you go."
              />
            ) : (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  {p.stats.explicitCount} you told us · {p.stats.inferredCount} learned from{' '}
                  {p.stats.evidenceCount} pieces of evidence
                </p>
                <ul className="divide-y divide-border">
                  {p.preferences.map((pref) => (
                    <li key={pref.id}>
                      <button
                        type="button"
                        onClick={() => setOpen(pref)}
                        className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-2.5 text-left hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-brand sm:grid-cols-[1fr_8rem_6rem_5rem]"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <PreferenceChip
                            label={pref.label}
                            value={pref.value}
                            confidence={pref.confidence}
                            explicit={pref.explicit}
                          />
                          <span className="text-xs text-muted-foreground">{pref.prefType}</span>
                        </span>
                        <ValueBar value={pref.value} />
                        <span className="text-xs text-muted-foreground">
                          {Math.round(pref.confidence * 100)}% confident
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {pref.evidenceCount} evidence
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex gap-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  Strong dislikes you’ve stated lower a recipe’s rank for you alone, but exclude it
                  entirely when you’re in a Meal Party. Preferences don’t fade over time yet.
                </p>
              </>
            )
          }
        </QueryState>
        {open && <EvidenceDialog pref={open} onClose={() => setOpen(null)} />}
      </div>
    </Card>
  );
}

function PrivacyCard({ user }: { user: Me }) {
  const settings = useUpdateSettings();
  const exportData = useExportData();
  const deleteData = useDeleteData();
  return (
    <Card>
      <CardHeader title="Privacy & your data" />
      <div className="space-y-5 p-4 sm:p-5">
        <Switch
          label="Share my taste with Meal Parties I join"
          description="Lets group recommendations use your likes and dislikes. Your allergies and diet are always shared with the host, because they keep everyone safe."
          checked={user.shareTasteWithParties}
          disabled={settings.isPending}
          onCheckedChange={(checked) =>
            settings.mutate(
              { shareTasteWithParties: checked },
              { onError: (e) => toast('Couldn’t save that', errorMessage(e)) },
            )
          }
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            loading={exportData.isPending}
            onClick={() =>
              exportData.mutate(undefined, {
                onSuccess: (data) => downloadJson('tastepilot-export.json', data),
                onError: (e) => toast('Export failed', errorMessage(e)),
              })
            }
          >
            <Download className="size-4" aria-hidden /> Export my data
          </Button>
          <ConfirmDialog
            trigger={<Button variant="secondary">Delete my profile data</Button>}
            title="Delete your profile data?"
            description="This removes your allergies, preferences, food history, feedback and pantry. Your account, recipes and parties stay. This can’t be undone."
            confirmLabel="Delete data"
            pending={deleteData.isPending}
            onConfirm={() =>
              deleteData
                .mutateAsync()
                .then(() => toast('Your profile data was deleted'))
                .catch((e: unknown) => toast('Couldn’t delete', errorMessage(e)))
            }
          />
        </div>
      </div>
    </Card>
  );
}

export function TasteProfileView({ user, welcome }: { user: Me; welcome: boolean }) {
  return (
    <>
      <PageHeader
        title="Your taste profile"
        description="One profile drives every recommendation and every safety check."
      />
      {welcome && (
        <div className="mb-6 rounded-xl border border-brand/30 bg-brand/10 p-4 text-sm">
          <p className="font-medium">Welcome to TastePilot!</p>
          <p className="mt-1 text-muted-foreground">
            Start by telling us about any allergies or diets, and a few things you love. You can
            change it any time.
          </p>
        </div>
      )}
      <div className="space-y-6">
        <Card className="p-4 sm:p-5">
          <StatementBox />
        </Card>
        <ConstraintsCard />
        <PreferencesCard />
        <PrivacyCard user={user} />
      </div>
    </>
  );
}
