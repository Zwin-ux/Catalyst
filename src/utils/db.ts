import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL ||
  '';

const shouldUseSsl =
  Boolean(connectionString) &&
  !connectionString.includes('localhost') &&
  !connectionString.includes('127.0.0.1');

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
    })
  : null;

export function hasDatabaseConnection(): boolean {
  return Boolean(pool);
}

export function getDatabaseConnectionString(): string {
  return connectionString;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}

const database = {
  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
    if (!pool) {
      throw new Error('DATABASE_URL is required for database-backed queries.');
    }

    const result = await pool.query(text, params);
    return { rows: result.rows as T[] };
  },
  async connect() {
    if (!pool) {
      throw new Error('DATABASE_URL is required for database-backed queries.');
    }

    return pool.connect();
  },
};

export default database;
