import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrateDatabase } from '../database/migrateDatabase.js';
import { InMemorySessionRepository } from './InMemorySessionRepository.js';
import { PostgresSessionRepository } from './PostgresSessionRepository.js';
import { createSessionRepository } from './createSessionRepository.js';

interface RepositoryWithPool {
  readonly pool: {
    readonly options: {
      readonly connectionTimeoutMillis?: number;
    };
  };
}

describe('createSessionRepository', () => {
  let migratedContainer: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let unmigratedContainer: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let migratedDatabaseUrl: string;
  let unmigratedDatabaseUrl: string;

  beforeAll(async () => {
    migratedContainer = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();
    unmigratedContainer = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();
    migratedDatabaseUrl = migratedContainer.getConnectionUri();
    unmigratedDatabaseUrl = unmigratedContainer.getConnectionUri();
    await migrateDatabase(migratedDatabaseUrl);
  }, 120_000);

  afterAll(async () => {
    await migratedContainer?.stop();
    await unmigratedContainer?.stop();
  });

  it('usa memoria cuando DATABASE_URL no existe', async () => {
    const persistence = await createSessionRepository({});

    expect(persistence.repository).toBeInstanceOf(InMemorySessionRepository);
    await expect(persistence.close()).resolves.toBeUndefined();
  });

  it('usa memoria cuando DATABASE_URL esta vacia', async () => {
    const persistence = await createSessionRepository({ databaseUrl: '   ' });

    expect(persistence.repository).toBeInstanceOf(InMemorySessionRepository);
    await expect(persistence.close()).resolves.toBeUndefined();
  });

  it('rechaza una DATABASE_URL invalida antes de devolver el repositorio', async () => {
    await expect(
      createSessionRepository({
        connectionTimeoutMillis: 50,
        databaseUrl: 'postgres://test:test@127.0.0.1:1/test',
      }),
    ).rejects.toThrow();
  });

  it('rechaza PostgreSQL sin migraciones antes de devolver el repositorio', async () => {
    await expect(createSessionRepository({ databaseUrl: unmigratedDatabaseUrl })).rejects.toThrow(
      'El esquema PostgreSQL de sesiones no esta migrado.',
    );
  }, 120_000);

  it('usa PostgreSQL cuando DATABASE_URL esta configurada y migrada', async () => {
    const persistence = await createSessionRepository({
      databaseUrl: migratedDatabaseUrl,
    });

    try {
      expect(persistence.repository).toBeInstanceOf(PostgresSessionRepository);
      expect(
        (persistence.repository as unknown as RepositoryWithPool).pool.options
          .connectionTimeoutMillis,
      ).toBe(5_000);
    } finally {
      await persistence.close();
    }
  }, 120_000);
});
