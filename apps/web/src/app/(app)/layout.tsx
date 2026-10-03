'use client';

import { AuthGate, UserMenu } from '@/features/auth';
import { AppShell } from '@/components/app-shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      {(user) => (
        <AppShell user={user} userMenu={<UserMenu user={user} />}>
          {children}
        </AppShell>
      )}
    </AuthGate>
  );
}
