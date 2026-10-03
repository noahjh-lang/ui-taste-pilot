import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">We couldn&apos;t find what you were looking for.</p>
      <Link href="/" className="mt-6 inline-block font-medium text-brand underline">
        Back to TastePilot
      </Link>
    </main>
  );
}
