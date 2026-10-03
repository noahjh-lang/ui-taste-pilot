import type { z } from 'zod';
import { ApiContractError, ApiError } from './errors';
import { apiErrorBodySchema } from './schemas/common';

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  /** Extra headers per request, e.g. CSRF token and device id. */
  getHeaders?: () => Record<string, string>;
}

type QueryValue = string | number | boolean | null | undefined | string[];

export interface RequestOptions<TSchema extends z.ZodType> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  schema: TSchema;
  signal?: AbortSignal;
}

function buildQuery(query: Record<string, QueryValue> | undefined) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function toApiError(response: Response, path: string) {
  const retryAfterHeader = response.headers.get('Retry-After');
  const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : null;
  try {
    const parsed = apiErrorBodySchema.safeParse(await response.json());
    if (parsed.success) {
      return new ApiError(response.status, path, { ...parsed.data.error, retryAfter });
    }
  } catch {
    // Non-JSON error body; fall through.
  }
  return new ApiError(response.status, path, { retryAfter });
}

/**
 * Thin typed wrapper over fetch. Every response is validated against a Zod
 * schema, so a backend contract change surfaces as an error here rather than
 * as a silent runtime bug further down.
 */
export function createApiClient({ baseUrl, fetch: fetchImpl, getHeaders }: ApiClientOptions) {
  async function request<TSchema extends z.ZodType>(
    path: string,
    { method = 'GET', body, query, schema, signal }: RequestOptions<TSchema>,
  ): Promise<z.infer<TSchema>> {
    const doFetch = fetchImpl ?? globalThis.fetch;
    const headers: Record<string, string> = { Accept: 'application/json', ...getHeaders?.() };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await doFetch(`${baseUrl}${path}${buildQuery(query)}`, {
      method,
      signal,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      throw await toApiError(response, path);
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
