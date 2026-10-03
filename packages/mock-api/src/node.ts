import { setupServer } from 'msw/node';
import { MockBackend, type BackendOptions } from './backend';
import { createHandlers } from './handlers';

/** A fresh in-memory stub backend plus an MSW server for Node tests. */
export function createMockServer(options: BackendOptions & { baseUrl?: string } = {}) {
  const backend = new MockBackend({ ...options, storage: null });
  const server = setupServer(
    ...createHandlers(backend, options.baseUrl ?? 'http://localhost:3000/api'),
  );
  return { backend, server };
}
