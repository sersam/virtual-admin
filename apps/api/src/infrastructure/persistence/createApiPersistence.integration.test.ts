import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPostgresPool } from '../database/createPostgresPool.js';
import { migrateDatabase } from '../database/migrateDatabase.js';
import { InMemoryUploadedDocumentRepository } from '../document/InMemoryUploadedDocumentRepository.js';
import { PostgresDocumentChunkRepository } from '../document/PostgresDocumentChunkRepository.js';
import { PostgresUploadedDocumentRepository } from '../document/PostgresUploadedDocumentRepository.js';
import { InMemoryIncidentRepository } from '../incident/InMemoryIncidentRepository.js';
import { PostgresIncidentRepository } from '../incident/PostgresIncidentRepository.js';
import { InMemoryPendingAgreementRepository } from '../meetingAgenda/InMemoryPendingAgreementRepository.js';
import { PostgresPendingAgreementRepository } from '../meetingAgenda/PostgresPendingAgreementRepository.js';
import { InMemoryProposalRepository } from '../proposal/InMemoryProposalRepository.js';
import { PostgresProposalRepository } from '../proposal/PostgresProposalRepository.js';
import { InMemoryAiActionQuotaRepository } from '../quota/InMemoryAiActionQuotaRepository.js';
import { PostgresAiActionQuotaRepository } from '../quota/PostgresAiActionQuotaRepository.js';
import { InMemorySessionRepository } from '../session/InMemorySessionRepository.js';
import { PostgresSessionRepository } from '../session/PostgresSessionRepository.js';
import { InMemoryAiTelemetryEventRepository } from '../telemetry/InMemoryAiTelemetryEventRepository.js';
import { PostgresAiTelemetryEventRepository } from '../telemetry/PostgresAiTelemetryEventRepository.js';
import { createApiPersistence } from './createApiPersistence.js';

interface RepositoryWithPool {
  readonly pool: pg.Pool;
}

describe('createApiPersistence', () => {
  let migratedContainer: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let incompleteContainer: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let migratedDatabaseUrl: string;
  let incompleteDatabaseUrl: string;

  beforeAll(async () => {
    migratedContainer = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();
    incompleteContainer = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();
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
    expect(withoutUrl.aiActionQuotaRepository).toBeInstanceOf(InMemoryAiActionQuotaRepository);
    expect(withoutUrl.aiTelemetryEventRepository).toBeInstanceOf(
      InMemoryAiTelemetryEventRepository,
    );
    expect(withoutUrl.incidentRepository).toBeInstanceOf(InMemoryIncidentRepository);
    expect(withoutUrl.pendingAgreementRepository).toBeInstanceOf(
      InMemoryPendingAgreementRepository,
    );
    expect(withoutUrl.proposalRepository).toBeInstanceOf(InMemoryProposalRepository);
    expect(withoutUrl.uploadedDocumentRepository).toBeInstanceOf(
      InMemoryUploadedDocumentRepository,
    );
    expect(withoutUrl.documentChunkRepository).toBeUndefined();
    expect(blankUrl.sessionRepository).toBeInstanceOf(InMemorySessionRepository);
    expect(blankUrl.aiActionQuotaRepository).toBeInstanceOf(InMemoryAiActionQuotaRepository);
    expect(blankUrl.aiTelemetryEventRepository).toBeInstanceOf(InMemoryAiTelemetryEventRepository);
    expect(blankUrl.uploadedDocumentRepository).toBeInstanceOf(InMemoryUploadedDocumentRepository);
    expect(blankUrl.documentChunkRepository).toBeUndefined();
    await expect(withoutUrl.close()).resolves.toBeUndefined();
    await expect(blankUrl.close()).resolves.toBeUndefined();
  });

  it('usa PostgreSQL migrado con un unico pool compartido y cierre idempotente', async () => {
    const persistence = await createApiPersistence({ databaseUrl: migratedDatabaseUrl });

    try {
      expect(persistence.sessionRepository).toBeInstanceOf(PostgresSessionRepository);
      expect(persistence.aiActionQuotaRepository).toBeInstanceOf(PostgresAiActionQuotaRepository);
      expect(persistence.aiTelemetryEventRepository).toBeInstanceOf(
        PostgresAiTelemetryEventRepository,
      );
      expect(persistence.incidentRepository).toBeInstanceOf(PostgresIncidentRepository);
      expect(persistence.pendingAgreementRepository).toBeInstanceOf(
        PostgresPendingAgreementRepository,
      );
      expect(persistence.proposalRepository).toBeInstanceOf(PostgresProposalRepository);
      expect(persistence.uploadedDocumentRepository).toBeInstanceOf(
        PostgresUploadedDocumentRepository,
      );
      expect(persistence.documentChunkRepository).toBeInstanceOf(PostgresDocumentChunkRepository);

      const pool = (persistence.sessionRepository as unknown as RepositoryWithPool).pool;
      expect((persistence.incidentRepository as unknown as RepositoryWithPool).pool).toBe(pool);
      expect((persistence.pendingAgreementRepository as unknown as RepositoryWithPool).pool).toBe(
        pool,
      );
      expect((persistence.proposalRepository as unknown as RepositoryWithPool).pool).toBe(pool);
      expect((persistence.uploadedDocumentRepository as unknown as RepositoryWithPool).pool).toBe(
        pool,
      );
      expect((persistence.documentChunkRepository as unknown as RepositoryWithPool).pool).toBe(
        pool,
      );
      expect((persistence.aiActionQuotaRepository as unknown as RepositoryWithPool).pool).toBe(
        pool,
      );
      expect((persistence.aiTelemetryEventRepository as unknown as RepositoryWithPool).pool).toBe(
        pool,
      );

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
  const pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });

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
