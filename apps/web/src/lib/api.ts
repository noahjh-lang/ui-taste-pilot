import { createApiClient, createTastePilotApi } from '@tastepilot/api-client';
import { deviceId, readCookie } from './browser';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

const client = createApiClient({
  baseUrl: API_BASE_URL,
  getHeaders: () => {
    const headers: Record<string, string> = {};
    // Double-submit CSRF token: the server compares it with the session's.
    const csrf = readCookie('tp_csrf');
    if (csrf) headers['X-CSRF-Token'] = csrf;
    if (typeof window !== 'undefined') headers['X-Device-Id'] = deviceId();
    return headers;
  },
});

/** The one typed API. Nothing in the app calls fetch directly. */
export const api = createTastePilotApi(client);
