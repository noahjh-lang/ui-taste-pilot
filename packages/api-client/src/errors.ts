export class ApiError extends Error {
  readonly status: number;
  readonly path: string;
  /** Machine-readable code from the error body, e.g. `invite_revoked`. */
  readonly code: string;
  readonly details: Record<string, unknown>;
  /** Seconds to wait before retrying (429 responses). */
  readonly retryAfter: number | null;

  constructor(
    status: number,
    path: string,
    init: {
      code?: string;
      message?: string;
      details?: Record<string, unknown>;
      retryAfter?: number | null;
    } = {},
  ) {
    super(init.message ?? `Request to ${path} failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
    this.code = init.code ?? `http_${status}`;
    this.details = init.details ?? {};
    this.retryAfter = init.retryAfter ?? null;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isRateLimited() {
    return this.status === 429;
  }

  /** 4xx errors are the caller's problem; retrying won't fix them. */
  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }
}

/** The response arrived but did not match the contract we expect. */
export class ApiContractError extends Error {
  readonly path: string;

  constructor(path: string, cause: unknown) {
    super(`Response from ${path} did not match the expected schema`, { cause });
    this.name = 'ApiContractError';
    this.path = path;
  }
}
