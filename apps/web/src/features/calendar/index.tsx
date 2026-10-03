'use client';

import type { CalendarEntry } from '@tastepilot/api-client';
import { addDays, formatDate, startOfWeek, toIsoDate } from '@tastepilot/shared';
import {
  Avatar,
  Button,
  Card,
  Dialog,
  PageHeader,
  SafetyBadge,
  Select,
  Skeleton,
  toast,
} from '@tastepilot/ui';
import { CalendarPlus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryState } from '@/components/query-state';
import { api } from '@/lib/api';
import { MEAL_SLOTS } from '@/lib/options';
import { errorMessage } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';

function useCalendar(start: string) {
  return useQuery({
    queryKey: queryKeys.calendar(start),
    queryFn: ({ signal }) => api.calendar.get(start, 7, signal),
  });
}

function useAddEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.calendar.addEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.calendarAll }),
  });
}

/** Add a recipe to the household plan, from the recipe page. */
export function AddToCalendarButton({ recipeId }: { recipeId: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [slot, setSlot] = useState<CalendarEntry['slot']>('dinner');
  const add = useAddEntry();
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="sm" variant="secondary">
          <CalendarPlus className="size-4" aria-hidden /> Plan it
        </Button>
      }
      title="Add to the family calendar"
      description="Everyone in your household sees it, and it’s checked against all of their allergies and diets."
      footer={
        <Button
          loading={add.isPending}
          onClick={() =>
            add.mutate(
              { date, slot, recipeId },
              {
                onSuccess: (entry) => {
                  setOpen(false);
                  toast(
                    `Planned for ${formatDate(entry.date)}`,
                    entry.safety.status === 'safe'
                      ? 'Safe for the whole household.'
                      : entry.safety.status === 'conflict'
                        ? `Heads up: conflicts with ${[...new Set(entry.safety.reasons.filter((r) => r.kind === 'conflict').map((r) => r.memberName))].join(', ')}.`
                        : 'Some ingredients couldn’t be verified.',
                  );
                },
                onError: (e) => toast('Couldn’t add it', errorMessage(e)),
              },
            )
          }
        >
          Add to calendar
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="plan-date" className="text-sm font-medium">
            Day
          </label>
          <input
            id="plan-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="plan-slot" className="text-sm font-medium">
            Meal
          </label>
          <Select
            id="plan-slot"
            className="mt-1.5"
            value={slot}
            onChange={(e) => setSlot(e.target.value as CalendarEntry['slot'])}
          >
            {MEAL_SLOTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </Dialog>
  );
}

export function CalendarView() {
  const today = toIsoDate(new Date());
  const [start, setStart] = useState(startOfWeek(today));
  const calendar = useCalendar(start);
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: api.calendar.removeEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.calendarAll }),
  });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <>
      <PageHeader
        title="Family calendar"
        description="Plan meals for the household. Each one is checked against everyone’s allergies and diets."
        action={
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              aria-label="Previous week"
              onClick={() => setStart(addDays(start, -7))}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setStart(startOfWeek(today))}>
              This week
            </Button>
            <Button
              variant="secondary"
              size="sm"
              aria-label="Next week"
              onClick={() => setStart(addDays(start, 7))}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        }
      />
      <QueryState
        query={calendar}
        loading={<Skeleton className="h-96 w-full" />}
        errorTitle="Couldn’t load the calendar"
      >
        {(cal) => (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{cal.householdName}:</span>
              {cal.members.map((m) => (
                <span key={m.userId} className="inline-flex items-center gap-1">
                  <Avatar name={m.name} color={m.avatarColor} size="sm" /> {m.name.split(' ')[0]}
                </span>
              ))}
            </div>
            <ol className="grid gap-3 md:grid-cols-7">
              {days.map((day) => {
                const entries = cal.entries.filter((e) => e.date === day);
                return (
                  <li key={day}>
                    <Card className={day === today ? 'border-brand' : undefined}>
                      <h2 className="border-b border-border px-3 py-2 text-sm font-semibold">
                        {formatDate(day)}
                        {day === today && <span className="sr-only"> (today)</span>}
                      </h2>
                      <ul className="space-y-2 p-2">
                        {MEAL_SLOTS.map((slot) => {
                          const entry = entries.find((e) => e.slot === slot.value);
                          return (
                            <li
                              key={slot.value}
                              className="min-h-14 rounded-md bg-muted/40 p-2 text-xs"
                            >
                              <p className="text-muted-foreground">{slot.label}</p>
                              {entry ? (
                                <div className="mt-1 space-y-1">
                                  <Link
                                    href={`/recipes/${entry.recipeId}`}
                                    className="font-medium text-foreground hover:underline"
                                  >
                                    {entry.recipeEmoji} {entry.recipeTitle}
                                  </Link>
                                  <div className="flex items-center justify-between gap-1">
                                    <SafetyBadge size="sm" status={entry.safety.status} />
                                    <button
                                      type="button"
                                      aria-label={`Remove ${entry.recipeTitle} from ${slot.label.toLowerCase()} on ${formatDate(day)}`}
                                      onClick={() =>
                                        remove.mutate(entry.id, {
                                          onError: (e) =>
                                            toast('Couldn’t remove it', errorMessage(e)),
                                        })
                                      }
                                      className="inline-flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                                    >
                                      <X className="size-3.5" aria-hidden />
                                    </button>
                                  </div>
                                  {entry.safety.status === 'conflict' && (
                                    <p>
                                      Conflicts for{' '}
                                      {[
                                        ...new Set(
                                          entry.safety.reasons
                                            .filter((r) => r.kind === 'conflict')
                                            .map((r) => r.memberName),
                                        ),
                                      ].join(', ')}
                                    </p>
                                  )}
                                  <p className="text-muted-foreground">
                                    by {entry.addedByName.split(' ')[0]}
                                  </p>
                                </div>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </Card>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">
              Add meals from any recipe page with <strong>Plan it</strong>.
            </p>
          </>
        )}
      </QueryState>
    </>
  );
}
