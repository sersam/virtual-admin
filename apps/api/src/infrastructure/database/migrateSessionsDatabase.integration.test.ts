import { PostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrateSessionsDatabase } from './migrateSessionsDatabase.js';

const { Pool } = pg;

describe('migrateSessionsDatabase', () => {
  let container: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    databaseUrl = container.getConnectionUri();
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  });

  it('crea la tabla de sesiones y permite ejecutar la migracion de nuevo', async () => {
    await migrateSessionsDatabase(databaseUrl);
    await migrateSessionsDatabase(databaseUrl);

    const pool = new Pool({ connectionString: databaseUrl });

    try {
      const table = await pool.query<{ column_name: string; data_type: string }>(
        `
          select column_name, data_type
          from information_schema.columns
          where table_schema = 'public' and table_name = 'demo_sessions'
          order by ordinal_position
        `,
      );
      const checks = await pool.query<{ constraint_name: string }>(
        `
          select constraint_name
          from information_schema.table_constraints
          where table_schema = 'public'
            and table_name = 'demo_sessions'
            and constraint_name like 'demo_sessions_%'
            and constraint_type = 'CHECK'
          order by constraint_name
        `,
      );

      expect(table.rows).toEqual([
        { column_name: 'id', data_type: 'uuid' },
        { column_name: 'created_at', data_type: 'timestamp with time zone' },
        { column_name: 'last_seen_at', data_type: 'timestamp with time zone' },
        { column_name: 'expires_at', data_type: 'timestamp with time zone' },
        { column_name: 'requests_used', data_type: 'integer' },
        { column_name: 'requests_limit', data_type: 'integer' },
      ]);
      expect(checks.rows.map(({ constraint_name }) => constraint_name)).toEqual([
        'demo_sessions_expires_after_created',
        'demo_sessions_requests_limit_positive',
        'demo_sessions_requests_used_non_negative',
        'demo_sessions_requests_used_not_above_limit',
      ]);
    } finally {
      await pool.end();
    }
  }, 120_000);
});
