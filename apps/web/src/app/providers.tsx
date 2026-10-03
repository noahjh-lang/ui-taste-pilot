'use client';

import { Toaster, TooltipProvider } from '@tastepilot/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect, useState } from 'react';
import { createQueryClient } from '@/lib/query-client';

const MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';

/**
 * In stub mode, start the mock backend (a Service Worker answering /api/*)
 * before anything renders, so no request races ahead of it.
 */
function MockGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!MOCKING);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!MOCKING) return;
    import('@tastepilot/mock-api/browser')
      .then(({ startMockApi }) => startMockApi())
      .then(() => setReady(true))
      .catch((error: unknown) => {
        console.error('Failed to start the stub backend', error);
        setFailed(true);
      });
  }, []);

  if (failed) {
    return (
      <div role="alert" className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-semibold">The demo backend couldn’t start.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This browser may be blocking Service Workers (for example in a private window). Try a
          regular window.
        </p>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <span className="text-sm text-muted-foreground">Loading TastePilot…</span>
      </div>
    );
  }
  return children;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MockGate>{children}</MockGate>
        <Toaster />
      </TooltipProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
