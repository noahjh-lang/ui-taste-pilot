'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { ErrorState } from '@tastepilot/ui';
import type { ReactNode } from 'react';
import { errorMessage } from '@/lib/query-client';

/**
 * Standard loading / error / success rendering for a query. Errors always
 * say what failed and offer a retry; loading shows the given skeleton.
 */
export function QueryState<T>({
  query,
  loading,
  errorTitle,
  children,
}: {
  query: UseQueryResult<T>;
  loading: ReactNode;
  errorTitle?: string;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <>{loading}</>;
  if (query.isError) {
    return (
      <ErrorState
        title={errorTitle}
        message={errorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  }
  return <>{children(query.data)}</>;
}
