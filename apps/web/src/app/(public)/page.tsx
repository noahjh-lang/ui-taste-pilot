import { SafetyBadge } from '@tastepilot/ui';
import Link from 'next/link';

const FEATURES = [
  {
    title: 'A taste profile you can inspect',
    body: 'Tell us what you like in plain words, log what you cook and eat out, and see exactly why every recommendation was made.',
  },
  {
    title: 'Safety that never guesses',
    body: 'Every recipe and restaurant dish is checked against your allergies and diet: safe, conflict, or unverified. Never “probably fine”.',
  },
  {
    title: 'Meal Parties for groups',
    body: 'Invite guests with a link. Everyone’s allergies merge into one view for the host, and every potluck dish is checked against the group.',
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-16 py-6">
      <section>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Meal planning that learns what you like and what you can safely eat.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Recommendations from one explainable taste profile, and an allergy check that never
          guesses.
        </p>
        <div className="mt-6 flex flex-wrap gap-2" aria-label="Safety states">
          <SafetyBadge status="safe" />
          <SafetyBadge status="conflict" />
          <SafetyBadge status="unverified" />
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center rounded-md bg-brand px-5 font-medium text-brand-foreground"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-md border border-border px-5 font-medium"
          >
            Log in
          </Link>
        </div>
      </section>
      <section aria-labelledby="features" className="grid gap-6 sm:grid-cols-3">
        <h2 id="features" className="sr-only">
          Features
        </h2>
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-surface p-5">
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
