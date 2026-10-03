/** Thrown by services; the HTTP layer turns it into the standard error body. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
    readonly headers?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Not found') => new HttpError(404, 'not_found', what);
export const forbidden = (message = "You don't have access to this.") =>
  new HttpError(403, 'forbidden', message);
export const badRequest = (message: string, details?: Record<string, unknown>) =>
  new HttpError(400, 'bad_request', message, details);
