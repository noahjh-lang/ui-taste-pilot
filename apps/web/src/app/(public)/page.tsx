import Link from 'next/link';

export default function LandingPage() {
  return (
    <section className="py-12">
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
        Meal planning that learns what you like and what you can safely eat.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        A taste profile you can inspect, and an allergy check that never guesses.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/signup"
          className="inline-flex min-h-11 items-center rounded-md bg-brand px-4 font-medium text-brand-foreground"
        >
          Get started
        </Link>
        <Link
          href="/home"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4 font-medium"
        >
          Open the app (dev)
        </Link>
      </div>
    </section>
  );
}
