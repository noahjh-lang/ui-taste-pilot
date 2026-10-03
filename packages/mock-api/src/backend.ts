import { DB_VERSION, emptyDb, type Db } from './db';
import { buildSeed } from './seed';

const STORAGE_KEY = 'tastepilot:mock-db';

export interface BackendOptions {
  /** Where to persist the database. Omit for an in-memory backend (tests). */
  storage?: Storage | null;
  /** Fixed clock for tests. */
  now?: () => Date;
  /** Artificial latency, so loading states are visible in dev. */
  latencyMs?: number;
}

/**
 * The stub backend: an in-memory database (optionally persisted to
 * localStorage) plus a clock. Services take it as their first argument.
 */
export class MockBackend {
  db: Db;
  readonly latencyMs: number;
  private readonly storage: Storage | null;
  private readonly clock: () => Date;

  constructor(options: BackendOptions = {}) {
    this.storage = options.storage ?? null;
    this.clock = options.now ?? (() => new Date());
    this.latencyMs = options.latencyMs ?? 0;
    this.db = emptyDb();
    this.db = this.load() ?? buildSeed(this);
    this.save();
  }

  now() {
    return this.clock();
  }

  nowIso() {
    return this.clock().toISOString();
  }

  /** `YYYY-MM-DD` for `offsetDays` from today. */
  dateOffset(offsetDays: number) {
    const d = new Date(this.clock());
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  save() {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch {
      // Storage full or unavailable: keep working in memory.
    }
  }

  reset() {
    this.db = buildSeed(this);
    this.save();
  }

  private load(): Db | null {
    if (!this.storage) return null;
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const db = JSON.parse(raw) as Db;
      return db.version === DB_VERSION ? db : null;
    } catch {
      return null;
    }
  }
}
