import type { z } from 'zod';
import { ApiContractError, ApiError } from './errors';

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
}

export interface RequestOptions<TSchema extends z.ZodType> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  schema: TSchema;
  signal?: AbortSignal;
}

/**
 * Thin typed wrapper over fetch. Every response is validated against a Zod
 * schema, so a backend contract change surfaces as an error here rather than
 * as a silent runtime bug further down.
 */
export function createApiClient({ baseUrl, fetch: fetchImpl = fetch }: ApiClientOptions) {
  async function request<TSchema extends z.ZodType>(
    path: string,
    { method = 'GET', body, schema, signal }: RequestOptions<TSchema>,
  ): Promise<z.infer<TSchema>> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      signal,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      throw new ApiError(response.status, path);
    }

    const json: unknown = response.status === 204 ? null : await response.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiContractError(path, parsed.error);
    }
    return parsed.data;
  }

  return { request };
}

export type ApiClient = ReturnType<typeof createApiClient>;
