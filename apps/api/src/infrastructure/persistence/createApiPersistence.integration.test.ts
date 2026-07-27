import { PostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrateDatabase } from '../database/migrateDatabase.js';
import { InMemoryIncidentRepository } from '../incident/InMemoryIncidentRepository.js';
import { PostgresIncidentRepository } from '../incident/PostgresIncidentRepository.js';
import { InMemoryPendingAgreementRepository } from '../meetingAgenda/InMemoryPendingAgreementRepository.js';
import { PostgresPendingAgreementRepository } from '../meetingAgenda/PostgresPendingAgreementRepository.js';
import { InMemoryProposalRepository } from '../proposal/InMemoryProposalRepository.js';
import { PostgresProposalRepository } from '../proposal/PostgresProposalRepository.js';
import { InMemorySessionRepository } from '../session/InMemorySessionRepository.js';
import { PostgresSessionRepository } from '../session/PostgresSessionRepository.js';
import { createApiPersistence } from './createApiPersistence.js';

const { Pool } = pg;

interface RepositoryWithPool {
  readonly pool: pg.Pool;
}

describe('createApiPersistence', () => {
  let migratedContainer: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let incompleteContainer: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let migratedDatabaseUrl: string;
  let incompleteDatabaseUrl: string;

  beforeAll(async () => {
    migratedContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    incompleteContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    migratedDatabaseUrl = migratedContainer.getConnectionUri();
    incompleteDatabaseUrl = incompleteContainer.getConnectionUri();
    await migrateDatabase(migratedDatabaseUrl);
    await createOnlySessionSchema(incompleteDatabaseUrl);
  }, 120_000);

  afterAll(async () => {
    await migratedContainer?.stop();
    await incompleteContainer?.stop();
  });

  it('usa repositorios en memoria cuando DATABASE_URL no existe o esta vacia', async () => {
    const withoutUrl = await createApiPersistence({});
    const blankUrl = await createApiPersistence({ databaseUrl: '   ' });

    expect(withoutUrl.sessionRepository).toBeInstanceOf(InMemorySessionRepository);
    expect(withoutUrl.incidentRepository).toBeInstanceOf(InMemoryIncidentRepository);
    expect(withoutUrl.pendingAgreementRepository).toBeInstanceOf(
      InMemoryPendingAgreementRepository,
    );
    expect(withoutUrl.proposalRepository).toBeInstanceOf(InMemoryProposalRepository);
    expect(blankUrl.sessionRepository).toBeInstanceOf(InMemorySessionRepository);
    await expect(withoutUrl.close()).resolves.toBeUndefined();
    await expect(blankUrl.close()).resolves.toBeUndefined();
  });

  it('usa PostgreSQL migrado con un unico pool compartido y cierre idempotente', async () => {
    const persistence = await createApiPersistence({ databaseUrl: migratedDatabaseUrl });

    try {
      expect(persistence.sessionRepository).toBeInstanceOf(PostgresSessionRepository);
      expect(persistence.incidentRepository).toBeInstanceOf(PostgresIncidentRepository);
      expect(persistence.pendingAgreementRepository).toBeInstanceOf(
        PostgresPendingAgreementRepository,
      );
      expect(persistence.proposalRepository).toBeInstanceOf(PostgresProposalRepository);

      const pool = (persistence.sessionRepository as unknown as RepositoryWithPool).pool;
      expect((persistence.incidentRepository as unknown as RepositoryWithPool).pool).toBe(pool);
      expect((persistence.pendingAgreementRepository as unknown as RepositoryWithPool).pool).toBe(
        pool,
      );
      expect((persistence.proposalRepository as unknown as RepositoryWithPool).pool).toBe(pool);

      await expect(persistence.close()).resolves.toBeUndefined();
      await expect(persistence.close()).resolves.toBeUndefined();
      expect(pool.ended).toBe(true);
    } finally {
      await persistence.close();
    }
  }, 120_000);

  it('rechaza una conexion invalida o un esquema incompleto sin fallback silencioso', async () => {
    await expect(
      createApiPersistence({
        connectionTimeoutMillis: 50,
        databaseUrl: 'postgres://test:test@127.0.0.1:1/test',
      }),
    ).rejects.toThrow();
    await expect(createApiPersistence({ databaseUrl: incompleteDatabaseUrl })).rejects.toThrow(
      'El esquema PostgreSQL de la API no esta migrado.',
    );
  }, 120_000);
});

async function createOnlySessionSchema(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(`
      create table demo_sessions (
        id uuid primary key not null,
        created_at timestamp with time zone not null,
        last_seen_at timestamp with time zone not null,
        expires_at timestamp with time zone not null,
        requests_used integer not null,
        requests_limit integer not null
      )
    `);
  } finally {
    await pool.end();
  }
}
