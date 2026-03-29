import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';

import db, { hasDatabaseConnection } from '../utils/db';
import type { CatalystState } from './types';

const DEFAULT_STATE: CatalystState = {
  guildInstallations: {},
  seasons: {},
  memberships: {},
  consentRecords: {},
  events: {},
  summaries: {},
};

export interface CatalystStateRepository {
  read(): Promise<CatalystState>;
  write(state: CatalystState): Promise<void>;
  update(mutator: (current: CatalystState) => CatalystState): Promise<CatalystState>;
}

export class CatalystStateStore implements CatalystStateRepository {
  private readonly filePath: string;
  private state: CatalystState | null = null;

  constructor(filePath: string = process.env.CATALYST_STATE_FILE || resolve(process.cwd(), 'data', 'catalyst-state.json')) {
    this.filePath = filePath;
  }

  async read(): Promise<CatalystState> {
    if (this.state) {
      return this.state;
    }

    try {
      const raw = await readFile(this.filePath, 'utf8');
      this.state = this.normalize(JSON.parse(raw));
      return this.state;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        throw error;
      }

      this.state = structuredClone(DEFAULT_STATE);
      await this.persist();
      return this.state;
    }
  }

  async write(state: CatalystState): Promise<void> {
    this.state = this.normalize(state);
    await this.persist();
  }

  async update(mutator: (current: CatalystState) => CatalystState): Promise<CatalystState> {
    const current = await this.read();
    const next = mutator(this.normalize(current));
    await this.write(next);
    return next;
  }

  private normalize(raw: Partial<CatalystState>): CatalystState {
    return {
      guildInstallations: raw.guildInstallations ?? {},
      seasons: raw.seasons ?? {},
      memberships: raw.memberships ?? {},
      consentRecords: raw.consentRecords ?? {},
      events: raw.events ?? {},
      summaries: raw.summaries ?? {},
    };
  }

  private async persist(): Promise<void> {
    if (!this.state) {
      return;
    }

    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.state, null, 2), 'utf8');
  }
}

export class PostgresCatalystStateStore implements CatalystStateRepository {
  private ready = false;
  private cached: CatalystState | null = null;

  async read(): Promise<CatalystState> {
    await this.ensureTable();
    if (this.cached) {
      return this.cached;
    }

    const { rows } = await db.query<{ payload: CatalystState }>(
      'SELECT payload FROM catalyst_runtime_state WHERE id = $1',
      ['main'],
    );
    const payload = rows[0]?.payload ?? structuredClone(DEFAULT_STATE);
    this.cached = this.normalize(payload);
    return this.cached;
  }

  async write(state: CatalystState): Promise<void> {
    await this.ensureTable();
    const normalized = this.normalize(state);
    this.cached = normalized;
    await db.query(
      `INSERT INTO catalyst_runtime_state (id, payload, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (id)
       DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      ['main', JSON.stringify(normalized)],
    );
  }

  async update(mutator: (current: CatalystState) => CatalystState): Promise<CatalystState> {
    await this.ensureTable();
    const client = await db.connect();

    try {
      await client.query('BEGIN');
      const { rows } = await client.query<{ payload: CatalystState }>(
        'SELECT payload FROM catalyst_runtime_state WHERE id = $1 FOR UPDATE',
        ['main'],
      );
      const current = this.normalize(rows[0]?.payload ?? structuredClone(DEFAULT_STATE));
      const next = this.normalize(mutator(current));
      await client.query(
        `INSERT INTO catalyst_runtime_state (id, payload, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (id)
         DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        ['main', JSON.stringify(next)],
      );
      await client.query('COMMIT');
      this.cached = next;
      return next;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async ensureTable(): Promise<void> {
    if (this.ready) {
      return;
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS catalyst_runtime_state (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await db.query(
      `INSERT INTO catalyst_runtime_state (id, payload)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      ['main', JSON.stringify(DEFAULT_STATE)],
    );

    this.ready = true;
  }

  private normalize(raw: Partial<CatalystState>): CatalystState {
    return {
      guildInstallations: raw.guildInstallations ?? {},
      seasons: raw.seasons ?? {},
      memberships: raw.memberships ?? {},
      consentRecords: raw.consentRecords ?? {},
      events: raw.events ?? {},
      summaries: raw.summaries ?? {},
    };
  }
}

export function createCatalystStateStore(): CatalystStateRepository {
  if (hasDatabaseConnection()) {
    return new PostgresCatalystStateStore();
  }

  return new CatalystStateStore();
}
