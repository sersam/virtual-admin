import { createHmac } from 'node:crypto';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPostgresPool } from '../database/createPostgresPool.js';
import { migrateDatabase } from '../database/migrateDatabase.js';
import { PostgresAiActionQuotaRepository } from './PostgresAiActionQuotaRepository.js';

describe('PostgresAiActionQuotaRepository', () => {
  let container: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let databaseUrl: string;
  let pool: pg.Pool;
  let repository: PostgresAiActionQuotaRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();
    databaseUrl = container.getConnectionUri();
    await migrateDatabase(databaseUrl);
  }, 120_000);

  beforeEach(async () => {
    pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
    repository = new PostgresAiActionQuotaRepository(pool);
    await pool.query('truncate table ai_action_quota_counters');
  });

  afterEach(async () => {
    if (!pool.ended) await pool.end();
  });

  afterAll(async () => {
    await container?.stop();
  });

  it('persiste contadores por hash despues de reabrir la conexion', async () => {
    await repository.reserve(baseInput);
    await pool.end();

    pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
    repository = new PostgresAiActionQuotaRepository(pool);

    await expect(repository.reserve({ ...baseInput, sessionLimit: 1 })).resolves.toEqual({
      reason: 'session-quota',
      status: 'rejected',
    });
  });

  it('no almacena IP ni sesion en claro', async () => {
    const day = '2026-07-31';
    const rawIp = '203.0.113.10';
    const rawSession = 'session-raw';
    const secret = 'quota-test-secret';
    const ipHash = hashIdentityForTest(secret, day, rawIp);
    const sessionHash = hashIdentityForTest(secret, day, rawSession);

    await repository.reserve({ ...baseInput, day, ipHash, sessionHash });

    const rows = await pool.query<{
      identity_hash: string;
      scope: string;
    }>('select scope, identity_hash from ai_action_quota_counters order by scope');

    expect(rows.rows).toEqual([
      { scope: 'ip', identity_hash: ipHash },
      { scope: 'session', identity_hash: sessionHash },
    ]);
    expect(JSON.stringify(rows.rows)).not.toContain(rawIp);
    expect(JSON.stringify(rows.rows)).not.toContain(rawSession);
  });

  it('serializa consumos concurrentes de varias sesiones para una misma IP', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_value, index) =>
        repository.reserve({
          ...baseInput,
          ipLimit: 3,
          sessionHash: `${'a'.repeat(63)}${index}`,
          sessionLimit: 10,
        }),
      ),
    );

    expect(
      results.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 'reserved',
      ),
    ).toHaveLength(3);
    expect(
      results.filter(
        (result) =>
          result.status === 'fulfilled' &&
          result.value.status === 'rejected' &&
          result.value.reason === 'ip-quota',
      ),
    ).toHaveLength(5);
  });
});

const baseInput = {
  day: '2026-07-31',
  ipHash: 'b'.repeat(64),
  ipLimit: 100,
  sessionHash: 'a'.repeat(64),
  sessionLimit: 20,
} as const;

function hashIdentityForTest(secret: string, day: string, value: string): string {
  return createHmac('sha256', secret).update(day).update(':').update(value).digest('hex');
}
