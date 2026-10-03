import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRouteParam } from './use-route-param';

const pathname = vi.hoisted(() => ({ current: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

describe('useRouteParam', () => {
  beforeEach(() => {
    pathname.current = '/';
  });

  it.each([
    ['/recipes/42', '42'],
    ['/recipes/42/', '42'],
    ['/recipes/tree%20nut', 'tree nut'],
  ])('reads the segment after the prefix from %s', (path, expected) => {
    pathname.current = path;
    expect(renderHook(() => useRouteParam('recipes')).result.current).toBe(expected);
  });

  it.each(['/recipes/_', '/recipes/', '/home'])(
    'returns null when the value is unknown (%s)',
    (path) => {
      pathname.current = path;
      expect(renderHook(() => useRouteParam('recipes')).result.current).toBeNull();
    },
  );
});
