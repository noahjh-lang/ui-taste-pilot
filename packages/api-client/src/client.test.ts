import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';
import { ApiContractError, ApiError } from './errors';
import { safetyResultSchema } from './schemas/safety';

function clientReturning(response: Response, getHeaders?: () => Record<string, string>) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  return {
    fetchMock,
    client: createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock, getHeaders }),
  };
}

const safe = { status: 'conflict', reasons: [], checkedAt: '2026-10-03T00:00:00Z' };

describe('createApiClient', () => {
  it('returns parsed data for a valid response and sends extra headers', async () => {
    const { client, fetchMock } = clientReturning(Response.json(safe), () => ({
      'X-CSRF-Token': 't',
    }));

    await expect(
      client.request('/recipes/1/safety', { schema: safetyResultSchema }),
    ).resolves.toEqual(safe);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/recipes/1/safety',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        headers: expect.objectContaining({ 'X-CSRF-Token': 't' }),
      }),
    );
  });

  it('serialises query parameters, skipping empty values', async () => {
    const { client, fetchMock } = clientReturning(Response.json(safe));
    await client.request('/search', {
      query: { q: 'soup', tags: ['quick', 'vegan'], maxTime: undefined, empty: '' },
      schema: safetyResultSchema,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://api.test/search?q=soup&tags=quick&tags=vegan',
    );
  });

  it('throws ApiError carrying the error code, message and Retry-After', async () => {
    const { client } = clientReturning(
      Response.json(
        { error: { code: 'rate_limited', message: 'Too many attempts' } },
        { status: 429, headers: { 'Retry-After': '30' } },
      ),
    );

    const error = await client
      .request('/auth/login', { schema: safetyResultSchema })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 429,
      code: 'rate_limited',
      message: 'Too many attempts',
      retryAfter: 30,
    });
    expect((error as ApiError).isRateLimited).toBe(true);
  });

  it('rejects a safety status the frontend does not model, rather than guessing', async () => {
    const { client } = clientReturning(Response.json({ ...safe, status: 'probably_safe' }));

    await expect(
      client.request('/recipes/1/safety', { schema: safetyResultSchema }),
    ).rejects.toBeInstanceOf(ApiContractError);
  });
});
