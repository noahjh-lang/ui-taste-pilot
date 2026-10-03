'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { safeStorage } from './browser';

export type Theme = 'light' | 'dark' | 'system';
const KEY = 'tastepilot:theme';

/** Inline in <head> so the right theme applies before first paint. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}})();`;

const listeners = new Set<() => void>();

function apply(theme: Theme) {
  const dark =
    theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

function read(): Theme {
  return (safeStorage()?.getItem(KEY) as Theme | null) ?? 'system';
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => 'system' as Theme,
  );
  const setTheme = useCallback((next: Theme) => {
    safeStorage()?.setItem(KEY, next);
    apply(next);
    listeners.forEach((l) => l());
  }, []);
  return { theme, setTheme };
}
