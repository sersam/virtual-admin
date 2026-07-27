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
): SessionPersistence {
  if (!options.databaseUrl?.trim()) {
    return {
      repository: new InMemorySessionRepository(),
      close: async () => undefined,
    };
  }

  const pool = new Pool({
    connectionString: options.databaseUrl,
    connectionTimeoutMillis: options.connectionTimeoutMillis,
  });

  return {
    repository: new PostgresSessionRepository(pool),
    close: async () => {
      await pool.end();
    },
  };
}
