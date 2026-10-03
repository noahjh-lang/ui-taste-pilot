export class ApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(status: number, path: string, message?: string) {
    super(message ?? `Request to ${path} failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
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
