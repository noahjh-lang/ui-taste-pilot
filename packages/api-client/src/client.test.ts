import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';
import { ApiContractError, ApiError } from './errors';
import { safetyResultSchema } from './schemas/safety';

function clientReturning(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  return { fetchMock, client: createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock }) };
}

describe('createApiClient', () => {
  it('returns parsed data for a valid response', async () => {
    const { client, fetchMock } = clientReturning(Response.json({ status: 'conflict' }));

    await expect(
      client.request('/recipes/1/safety', { schema: safetyResultSchema }),
    ).resolves.toEqual({ status: 'conflict' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/recipes/1/safety',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('throws ApiError with the status code on a non-2xx response', async () => {
    const { client } = clientReturning(new Response(null, { status: 403 }));

    const error = await client
      .request('/recipes/1/safety', { schema: safetyResultSchema })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isForbidden).toBe(true);
  });

  it('rejects a safety status the frontend does not model, rather than guessing', async () => {
    const { client } = clientReturning(Response.json({ status: 'probably_safe' }));

    await expect(
      client.request('/recipes/1/safety', { schema: safetyResultSchema }),
    ).rejects.toBeInstanceOf(ApiContractError);
  });
});
