'use client';

import { usePathname } from 'next/navigation';
import { STATIC_PARAM_PLACEHOLDER } from './static-params';

/**
 * Reads a dynamic route segment from the real URL.
 *
 * In the static export, `useParams()` returns the placeholder the page was
 * pre-rendered with, not the id in the address bar; `usePathname()` reflects
 * the real URL. Returns `null` while the real value is not known yet (during
 * pre-rendering).
 *
 * @param prefix the static segment before the param, e.g. `recipes` for `/recipes/[id]`
 */
export function useRouteParam(prefix: string): string | null {
  const segments = usePathname().split('/').filter(Boolean);
  const index = segments.indexOf(prefix);
  const value = index === -1 ? undefined : segments[index + 1];
  if (!value || value === STATIC_PARAM_PLACEHOLDER) return null;
  return decodeURIComponent(value);
}
