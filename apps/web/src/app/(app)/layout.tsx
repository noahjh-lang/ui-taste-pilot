import { AppNav } from './app-nav';

// Authenticated app shell. Route guarding (proxy + backend session) is not
// wired up yet -- see NOT_IMPLEMENTED.md.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <AppNav />
      <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
