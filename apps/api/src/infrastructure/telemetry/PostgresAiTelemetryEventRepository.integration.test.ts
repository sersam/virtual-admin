import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPostgresPool } from '../database/createPostgresPool.js';
import { migrateDatabase } from '../database/migrateDatabase.js';
import { PostgresAiTelemetryEventRepository } from './PostgresAiTelemetryEventRepository.js';

describe('PostgresAiTelemetryEventRepository', () => {
  let container: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let databaseUrl: string;
  let pool: pg.Pool;
  let repository: PostgresAiTelemetryEventRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();
    databaseUrl = container.getConnectionUri();
    await migrateDatabase(databaseUrl);
  }, 120_000);

  beforeEach(async () => {
    pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
    repository = new PostgresAiTelemetryEventRepository(pool);
    await pool.query('truncate table ai_telemetry_events');
  });

  afterEach(async () => {
    if (!pool.ended) await pool.end();
  });

  afterAll(async () => {
    await container?.stop();
  });

  it('persiste eventos tecnicos y genera agregados tras reabrir conexion', async () => {
    await repository.record(event);
    await pool.end();

    pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
    repository = new PostgresAiTelemetryEventRepository(pool);

    const response = await repository.summarizeDay({
      day: '2026-07-31',
      generatedAt: new Date('2026-07-31T12:00:00.000Z'),
      ipLimit: 100,
      sessionLimit: 20,
    });

    expect(response.summary).toMatchObject({ executions: 1, successes: 1, totalTokens: 30 });
    expect(response.byModel).toEqual([
      expect.objectContaining({ model: 'gpt-5-mini', provider: 'openai' }),
    ]);
  });

  it('no tiene columnas de contenido sensible', async () => {
    const columns = await pool.query<{ column_name: string }>(
      `
        select column_name
        from information_schema.columns
        where table_schema = 'public' and table_name = 'ai_telemetry_events'
      `,
    );

    for (const forbidden of ['prompt', 'response', 'document', 'session_id', 'ip_address']) {
      expect(columns.rows.map(({ column_name }) => column_name)).not.toContain(forbidden);
    }
  });
});

const event = {
  cachedInputTokens: 5,
  estimatedCostUsd: 0.001,
  inputTokens: 20,
  latencyMs: 100,
  model: 'gpt-5-mini',
  occurredAt: new Date('2026-07-31T10:00:00.000Z'),
  operation: 'document-answer',
  outputTokens: 10,
  promptVersion: 'document-answer.v1',
  provider: 'openai',
  result: 'success',
} as const;
