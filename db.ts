import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';
import type { Client as LibsqlClient, InValue } from '@libsql/client';
import pg from 'pg';
import type { Pool as PgPool } from 'pg';

export type DbBackendMode = 'turso' | 'postgres' | 'sqlite';

type SqlParam = string | number | null;
type RowRecord = Record<string, unknown>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure PostgreSQL BIGINT (OID 20) returns JavaScript numbers rather than strings
pg.types.setTypeParser(20, (val: string) => Number(val));

function convertPlaceholdersToPg(sql: string): string {
  let index = 0;
  let inSingleQuote = false;
  let out = '';

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (ch === "'") {
      if (inSingleQuote && sql[i + 1] === "'") {
        out += "''";
        i += 1;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      out += ch;
      continue;
    }
    if (ch === '?' && !inSingleQuote) {
      index += 1;
      out += `$${index}`;
    } else {
      out += ch;
    }
  }
  return out;
}

class UnifiedDb {
  public readonly mode: DbBackendMode;
  private tursoClient: LibsqlClient | null = null;
  private pgPool: PgPool | null = null;
  private sqliteDb: {
    exec: (sql: string) => void;
    prepare: (sql: string) => {
      get: (...args: SqlParam[]) => unknown;
      all: (...args: SqlParam[]) => unknown[];
      run: (...args: SqlParam[]) => unknown;
    };
  } | null = null;
  private initialized = false;

  constructor() {
    const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
    const pgUrl = process.env.DATABASE_URL?.trim();

    if (tursoUrl) {
      this.mode = 'turso';
      this.tursoClient = createClient({
        url: tursoUrl,
        authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
      });
    } else if (pgUrl) {
      this.mode = 'postgres';
      const isLocal = pgUrl.includes('localhost') || pgUrl.includes('127.0.0.1');
      this.pgPool = new pg.Pool({
        connectionString: pgUrl,
        ssl: isLocal ? undefined : { rejectUnauthorized: false },
      });
    } else {
      this.mode = 'sqlite';
    }
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    if (this.mode === 'sqlite') {
      const { DatabaseSync } = await import('node:sqlite');
      const dataDir = path.resolve(__dirname, 'data');
      fs.mkdirSync(dataDir, { recursive: true });
      const dbPath = path.join(dataDir, 'dahoodbet.db');
      const instance = new DatabaseSync(dbPath);
      instance.exec('PRAGMA journal_mode = WAL;');
      instance.exec('PRAGMA foreign_keys = ON;');
      this.sqliteDb = instance as unknown as typeof this.sqliteDb;
    }

    const statements = [
      `CREATE TABLE IF NOT EXISTS admin_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email_or_phone TEXT NOT NULL,
        email_lower TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        balance BIGINT NOT NULL DEFAULT 0,
        bonus_locked BIGINT NOT NULL DEFAULT 0,
        vip_level TEXT NOT NULL DEFAULT 'طلایی',
        referral_code TEXT NOT NULL,
        registered_at TEXT NOT NULL,
        is_blocked INTEGER NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        type TEXT NOT NULL,
        method TEXT NOT NULL,
        amount BIGINT NOT NULL,
        bonus_amount BIGINT NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        tracking_code TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        description TEXT NOT NULL,
        destination TEXT,
        tx_hash_or_ref TEXT,
        created_at BIGINT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS bet_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        game_title TEXT NOT NULL,
        bet_amount BIGINT NOT NULL,
        multiplier DOUBLE PRECISION NOT NULL,
        payout BIGINT NOT NULL,
        won INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sports_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        selections_json TEXT NOT NULL,
        stake BIGINT NOT NULL,
        total_odds DOUBLE PRECISION NOT NULL,
        potential_payout BIGINT NOT NULL,
        status TEXT NOT NULL,
        created_at_label TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sports_matches (
        id TEXT PRIMARY KEY,
        sort_order INTEGER NOT NULL,
        data TEXT NOT NULL
      )`,
    ];

    for (const stmt of statements) {
      await this.run(stmt);
    }

    this.initialized = true;
  }

  public async get<T = RowRecord>(sql: string, params: SqlParam[] = []): Promise<T | undefined> {
    if (this.mode === 'sqlite' && this.sqliteDb) {
      return this.sqliteDb.prepare(sql).get(...params) as T | undefined;
    }
    if (this.mode === 'turso' && this.tursoClient) {
      const res = await this.tursoClient.execute({
        sql,
        args: params as InValue[],
      });
      return (res.rows[0] as unknown as T) ?? undefined;
    }
    if (this.mode === 'postgres' && this.pgPool) {
      const res = await this.pgPool.query(convertPlaceholdersToPg(sql), params);
      return (res.rows[0] as T) ?? undefined;
    }
    throw new Error('Database not initialized');
  }

  public async all<T = RowRecord>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    if (this.mode === 'sqlite' && this.sqliteDb) {
      return this.sqliteDb.prepare(sql).all(...params) as T[];
    }
    if (this.mode === 'turso' && this.tursoClient) {
      const res = await this.tursoClient.execute({
        sql,
        args: params as InValue[],
      });
      return res.rows as unknown as T[];
    }
    if (this.mode === 'postgres' && this.pgPool) {
      const res = await this.pgPool.query(convertPlaceholdersToPg(sql), params);
      return res.rows as T[];
    }
    throw new Error('Database not initialized');
  }

  public async run(sql: string, params: SqlParam[] = []): Promise<void> {
    if (this.mode === 'sqlite' && this.sqliteDb) {
      this.sqliteDb.prepare(sql).run(...params);
      return;
    }
    if (this.mode === 'turso' && this.tursoClient) {
      await this.tursoClient.execute({
        sql,
        args: params as InValue[],
      });
      return;
    }
    if (this.mode === 'postgres' && this.pgPool) {
      await this.pgPool.query(convertPlaceholdersToPg(sql), params);
      return;
    }
    throw new Error('Database not initialized');
  }
}

export const db = new UnifiedDb();
