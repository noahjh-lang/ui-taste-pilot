import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 font-semibold text-brand">
        TastePilot
      </Link>
      <div className="rounded-xl border border-border bg-surface p-6">{children}</div>
    </main>
  );
}
