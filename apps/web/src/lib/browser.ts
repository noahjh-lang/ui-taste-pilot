/** Small browser helpers that are safe to call during prerendering. */

export function readCookie(name: string) {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.split(/;\s*/).find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

export function safeStorage(kind: 'local' | 'session' = 'local'): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function randomId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  );
}

/**
 * Stable per-browser id, sent when accepting invites so a returning guest is
 * recognised instead of duplicated.
 */
export function deviceId() {
  const storage = safeStorage();
  const key = 'tastepilot:device-id';
  let id = storage?.getItem(key);
  if (!id) {
    id = randomId();
    storage?.setItem(key, id);
  }
  return id;
}

/** Per-tab analytics session id. */
export function analyticsSessionId() {
  const storage = safeStorage('session');
  const key = 'tastepilot:analytics-session';
  let id = storage?.getItem(key);
  if (!id) {
    id = randomId();
    storage?.setItem(key, id);
  }
  return id;
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
