import { setupWorker } from 'msw/browser';
import { MockBackend } from './backend';
import { createHandlers } from './handlers';

let started: Promise<MockBackend> | null = null;

/**
 * Start the stub backend in the browser. Requests to `/api/*` are answered by
 * a Service Worker; data persists in this browser's localStorage.
 */
export function startMockApi(options: { latencyMs?: number; quiet?: boolean } = {}) {
  started ??= (async () => {
    const backend = new MockBackend({
      storage: window.localStorage,
      latencyMs: options.latencyMs ?? 250,
    });
    const worker = setupWorker(...createHandlers(backend, '/api'));
    await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: options.quiet ?? true,
      serviceWorker: { url: '/mockServiceWorker.js' },
    });
    // Handy in devtools: window.__tastepilotMock.reset()
    (window as unknown as { __tastepilotMock: unknown }).__tastepilotMock = {
      backend,
      reset: () => {
        backend.reset();
        document.cookie = 'tp_session=; Path=/; Max-Age=0';
        document.cookie = 'tp_csrf=; Path=/; Max-Age=0';
      },
    };
    return backend;
  })();
  return started;
}

/** Wipe the demo data back to the seed and sign out. */
export async function resetMockApi() {
  const backend = await startMockApi();
  backend.reset();
  document.cookie = 'tp_session=; Path=/; Max-Age=0';
  document.cookie = 'tp_csrf=; Path=/; Max-Age=0';
}
