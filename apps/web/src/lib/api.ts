import { createApiClient } from '@tastepilot/api-client';

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
});
