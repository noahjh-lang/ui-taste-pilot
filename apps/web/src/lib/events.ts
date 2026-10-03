import type { ClientEvent } from '@tastepilot/api-client';
import { api } from './api';
import { analyticsSessionId } from './browser';

type Props = ClientEvent['properties'];

let queue: ClientEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * Record a frontend event. Batched and sent to the same pipeline the backend
 * logs to (`beta_events`), correlated by session and party.
 */
export function track(name: string, properties: Props = {}, partyId: string | null = null) {
  if (typeof window === 'undefined') return;
  queue.push({
    name,
    properties,
    sessionId: analyticsSessionId(),
    partyId,
    occurredAt: new Date().toISOString(),
  });
  if (queue.length >= 20) void flush();
  else timer ??= setTimeout(() => void flush(), 3000);
}

export async function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (queue.length === 0) return;
  const batch = queue.slice(0, 50);
  queue = queue.slice(50);
  try {
    await api.events.send(batch);
  } catch {
    // Analytics must never break the app; drop the batch.
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });
}
