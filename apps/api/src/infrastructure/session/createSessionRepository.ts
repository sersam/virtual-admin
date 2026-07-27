import pg from 'pg';
import type { SessionRepository } from '../../application/ports/SessionRepository.js';
import { InMemorySessionRepository } from './InMemorySessionRepository.js';
import { PostgresSessionRepository } from './PostgresSessionRepository.js';

const { Pool } = pg;

interface CreateSessionRepositoryOptions {
  readonly connectionTimeoutMillis?: number;
  readonly databaseUrl?: string;
}

export interface SessionPersistence {
  readonly repository: SessionRepository;
  close(): Promise<void>;
}

export function createSessionRepository(
  options: CreateSessionRepositoryOptions,
): Promise<SessionPersistence> {
  if (!options.databaseUrl?.trim()) {
    return Promise.resolve({
      repository: new InMemorySessionRepository(),
      close: async () => undefined,
    });
  }

  const pool = new Pool({
    connectionString: options.databaseUrl,
    connectionTimeoutMillis: options.connectionTimeoutMillis,
  });

  return validatePostgresSessionSchema(pool).then(() => ({
    repository: new PostgresSessionRepository(pool),
    close: async () => {
      await pool.end();
    },
  }));
}

async function validatePostgresSessionSchema(pool: pg.Pool): Promise<void> {
  try {
    await pool.query(
      `
        select id, created_at, last_seen_at, expires_at, requests_used, requests_limit
        from demo_sessions
        limit 0
      `,
    );
  } catch (error) {
    await pool.end();
    if (isMissingSessionSchemaError(error)) {
      throw new Error('El esquema PostgreSQL de sesiones no esta migrado.');
    }
    throw error;
  }
}

function isMissingSessionSchemaError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === '42P01' || error.code === '42703')
  );
}
