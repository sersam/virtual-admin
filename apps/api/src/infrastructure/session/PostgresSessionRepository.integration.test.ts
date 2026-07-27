import { PostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DemoSession } from '../../domain/session/DemoSession.js';
import { migrateSessionsDatabase } from '../database/migrateSessionsDatabase.js';
import { PostgresSessionRepository } from './PostgresSessionRepository.js';

const { Pool } = pg;

const baseSession: DemoSession = {
  id: '00000000-0000-4000-8000-000000000001',
  createdAt: new Date('2026-06-23T08:00:00.000Z'),
  lastSeenAt: new Date('2026-06-23T08:00:00.000Z'),
  expiresAt: new Date('2026-06-23T08:01:00.000Z'),
  requestsUsed: 0,
  requestsLimit: 3,
};

describe('PostgresSessionRepository', () => {
  let container: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let databaseUrl: string;
  let pool: pg.Pool;
  let repository: PostgresSessionRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    databaseUrl = container.getConnectionUri();
    await migrateSessionsDatabase(databaseUrl);
  }, 120_000);

  beforeEach(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    repository = new PostgresSessionRepository(pool);
    await pool.query('truncate table demo_sessions');
  });

  afterEach(async () => {
    if (!pool.ended) await pool.end();
  });

  afterAll(async () => {
    await container?.stop();
  });

  it('guarda y recupera sesiones despues de reabrir la conexion', async () => {
    await repository.save(baseSession);
    await pool.end();

    pool = new Pool({ connectionString: databaseUrl });
    repository = new PostgresSessionRepository(pool);

    await expect(repository.findById(baseSession.id)).resolves.toEqual(baseSession);
  });

  it('actualiza una sesion existente al guardar el mismo id', async () => {
    const updatedSession = { ...baseSession, requestsUsed: 2 };

    await repository.save(baseSession);
    await repository.save(updatedSession);

    await expect(repository.findById(baseSession.id)).resolves.toEqual(updatedSession);
  });

  it('consume una sesion valida sin cambiar su fecha de expiracion ni su limite almacenado', async () => {
    await repository.save(baseSession);

    const consumed = await repository.consumeRequest({
      createSessionId: () => '00000000-0000-4000-8000-000000000002',
      now: new Date('2026-06-23T08:00:30.000Z'),
      requestsLimit: 99,
      sessionId: baseSession.id,
      ttlMs: 60_000,
    });

    expect(consumed).toEqual({
      ...baseSession,
      lastSeenAt: new Date('2026-06-23T08:00:30.000Z'),
      requestsUsed: 1,
    });
  });

  it('crea una sesion nueva con una primera peticion consumida cuando no hay id previo', async () => {
    const consumed = await repository.consumeRequest({
      createSessionId: () => baseSession.id,
      now: baseSession.createdAt,
      requestsLimit: 3,
      ttlMs: 60_000,
    });

    expect(consumed).toEqual({ ...baseSession, requestsUsed: 1 });
  });

  it('elimina sesiones expiradas y crea una nueva', async () => {
    await repository.save(baseSession);

    const renewed = await repository.consumeRequest({
      createSessionId: () => '00000000-0000-4000-8000-000000000002',
      now: new Date('2026-06-23T08:01:01.000Z'),
      requestsLimit: 4,
      sessionId: baseSession.id,
      ttlMs: 120_000,
    });

    await expect(repository.findById(baseSession.id)).resolves.toBeUndefined();
    expect(renewed).toMatchObject({
      id: '00000000-0000-4000-8000-000000000002',
      requestsUsed: 1,
      requestsLimit: 4,
    });
  });

  it('bloquea sesiones que ya alcanzaron el limite', async () => {
    await repository.save({ ...baseSession, requestsUsed: 3 });

    await expect(
      repository.consumeRequest({
        createSessionId: () => '00000000-0000-4000-8000-000000000002',
        now: new Date('2026-06-23T08:00:30.000Z'),
        requestsLimit: 3,
        sessionId: baseSession.id,
        ttlMs: 60_000,
      }),
    ).resolves.toBe('limit_reached');
  });

  it('serializa consumos concurrentes para no superar el limite', async () => {
    await repository.save({ ...baseSession, requestsUsed: 1, requestsLimit: 3 });

    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        repository.consumeRequest({
          createSessionId: () => '00000000-0000-4000-8000-000000000999',
          now: new Date('2026-06-23T08:00:30.000Z'),
          requestsLimit: 3,
          sessionId: baseSession.id,
          ttlMs: 60_000,
        }),
      ),
    );
    const finalSession = await repository.findById(baseSession.id);

    expect(
      results.filter((result) => result.status === 'fulfilled' && result.value !== 'limit_reached'),
    ).toHaveLength(2);
    expect(
      results.filter((result) => result.status === 'fulfilled' && result.value === 'limit_reached'),
    ).toHaveLength(2);
    expect(finalSession?.requestsUsed).toBe(3);
  });
});
