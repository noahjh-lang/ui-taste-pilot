import { HttpResponse, delay, http, type HttpHandler } from 'msw';
import type { z } from 'zod';
import type { MockBackend } from './backend';
import type { SessionRow, UserRow } from './db';
import { HttpError } from './errors';
import { sessionByToken } from './services/auth';

export const SESSION_COOKIE = 'tp_session';
export const CSRF_COOKIE = 'tp_csrf';
export const CSRF_HEADER = 'x-csrf-token';
export const DEVICE_HEADER = 'x-device-id';

/** Who may call a route. */
export type Access = 'public' | 'session' | 'full';

export interface RouteContext {
  b: MockBackend;
  request: Request;
  params: Record<string, string>;
  url: URL;
  session: SessionRow | null;
  user: UserRow | null;
  deviceId: string | null;
}

export interface AuthedContext extends RouteContext {
  session: SessionRow;
  user: UserRow;
}

type Result = unknown | Response;

/**
 * Test and demo controls, read per request from localStorage
 * (`tastepilot:mock-controls`), e.g. `{"hang": ["/safety"], "fail": ["/feed"]}`.
 * Lets e2e tests exercise loading and error states against the real UI.
 */
function controls(): { hang: string[]; fail: string[] } {
  try {
    const raw = globalThis.localStorage?.getItem('tastepilot:mock-controls');
    const parsed = raw ? (JSON.parse(raw) as Partial<{ hang: string[]; fail: string[] }>) : {};
    return { hang: parsed.hang ?? [], fail: parsed.fail ?? [] };
  } catch {
    return { hang: [], fail: [] };
  }
}

export function errorResponse(error: HttpError) {
  return HttpResponse.json(
    { error: { code: error.code, message: error.message, details: error.details } },
    { status: error.status, headers: error.headers },
  );
}

export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(400, 'validation_failed', 'Some fields need attention.', {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return parsed.data;
}

export async function readJson(request: Request) {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body is not valid JSON.');
  }
}

/** Set-Cookie for a new session. HttpOnly can't be emulated in a service worker; a real backend must set it. */
export function sessionCookies(session: SessionRow | null) {
  const headers = new Headers();
  if (session) {
    headers.append('Set-Cookie', `${SESSION_COOKIE}=${session.token}; Path=/; SameSite=Lax`);
    headers.append('Set-Cookie', `${CSRF_COOKIE}=${session.csrf}; Path=/; SameSite=Strict`);
  } else {
    headers.append('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`);
    headers.append('Set-Cookie', `${CSRF_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict`);
  }
  return headers;
}

function readCookie(request: Request, cookies: Record<string, string>, name: string) {
  if (cookies[name]) return cookies[name];
  const header = request.headers.get('cookie') ?? '';
  const match = header.split(/;\s*/).find((c) => c.startsWith(`${name}=`));
  return match?.slice(name.length + 1) || undefined;
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Routes a lite (guest) account may use; everything else needs a full account. */
export function createRouter(b: MockBackend, base: string) {
  const handlers: HttpHandler[] = [];

  function route(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    access: Access,
    handle: (ctx: RouteContext & { user: UserRow | null }) => Result | Promise<Result>,
  ) {
    handlers.push(
      http[method](`${base}${path}`, async ({ request, params, cookies }) => {
        if (b.latencyMs) await delay(b.latencyMs);
        const url = new URL(request.url);
        const ctl = controls();
        if (ctl.hang.some((p) => url.pathname.includes(p))) await delay('infinite');
        if (ctl.fail.some((p) => url.pathname.includes(p))) {
          return errorResponse(
            new HttpError(503, 'unavailable', 'Simulated outage (mock controls).'),
          );
        }

        try {
          const session = sessionByToken(b, readCookie(request, cookies, SESSION_COOKIE));
          const user = session ? (b.db.users.find((u) => u.id === session.userId) ?? null) : null;

          // CSRF: double-submit token on every state-changing request made with a session.
          if (session && MUTATING.has(request.method)) {
            if (request.headers.get(CSRF_HEADER) !== session.csrf) {
              throw new HttpError(
                403,
                'csrf_failed',
                'Your session expired. Refresh the page and try again.',
              );
            }
          }
          if (access !== 'public' && !user) {
            throw new HttpError(401, 'unauthenticated', 'Please sign in to continue.');
          }
          if (access === 'full' && user?.kind !== 'full') {
            throw new HttpError(
              403,
              'full_account_required',
              'Save your profile to use this part of TastePilot.',
            );
          }

          const result = await handle({
            b,
            request,
            params: params as Record<string, string>,
            url,
            session,
            user,
            deviceId: request.headers.get(DEVICE_HEADER),
          });
          if (MUTATING.has(request.method)) b.save();
          if (result instanceof Response) return result;
          return HttpResponse.json(result as Record<string, unknown>);
        } catch (error) {
          if (error instanceof HttpError) return errorResponse(error);
          console.error('[mock-api] unhandled error', error);
          return errorResponse(
            new HttpError(500, 'internal', 'Something went wrong in the stub backend.'),
          );
        }
      }),
    );
  }

  return { route, handlers };
}

/** Narrow a context once access has been checked. */
export const authed = (ctx: RouteContext) => ctx as AuthedContext;
