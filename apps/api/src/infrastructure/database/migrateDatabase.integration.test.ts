import { PostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getMigrationsFolder, migrateDatabase } from './migrateDatabase.js';

const { Pool } = pg;

describe('migrateDatabase', () => {
  let container: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    databaseUrl = container.getConnectionUri();
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  });

  it('expone la carpeta versionada de migraciones', () => {
    expect(getMigrationsFolder()).toMatch(/apps\/api\/drizzle$/);
  });

  it('rechaza una DATABASE_URL vacia', async () => {
    await expect(migrateDatabase('   ')).rejects.toThrow(
      'DATABASE_URL es obligatoria para migrar la base de datos.',
    );
  });

  it('crea la tabla de sesiones y permite ejecutar la migracion de nuevo', async () => {
    await migrateDatabase(databaseUrl);
    await migrateDatabase(databaseUrl);

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

  it('aplica las restricciones de integridad de sesiones', async () => {
    await migrateDatabase(databaseUrl);

    const pool = new Pool({ connectionString: databaseUrl });

    try {
      await expect(
        insertSession(pool, {
          id: '00000000-0000-4000-8000-000000000001',
          requestsUsed: -1,
          requestsLimit: 3,
        }),
      ).rejects.toMatchObject({ constraint: 'demo_sessions_requests_used_non_negative' });
      await expect(
        insertSession(pool, {
          id: '00000000-0000-4000-8000-000000000002',
          requestsUsed: 0,
          requestsLimit: 0,
        }),
      ).rejects.toMatchObject({ constraint: 'demo_sessions_requests_limit_positive' });
      await expect(
        insertSession(pool, {
          id: '00000000-0000-4000-8000-000000000003',
          requestsUsed: 4,
          requestsLimit: 3,
        }),
      ).rejects.toMatchObject({ constraint: 'demo_sessions_requests_used_not_above_limit' });
      await expect(
        insertSession(pool, {
          expiresAt: new Date('2026-06-23T08:00:00.000Z'),
          id: '00000000-0000-4000-8000-000000000004',
          requestsUsed: 0,
          requestsLimit: 3,
        }),
      ).rejects.toMatchObject({ constraint: 'demo_sessions_expires_after_created' });
    } finally {
      await pool.end();
    }
  }, 120_000);

  it('crea las tablas del estado comunitario con claves compuestas y cascada', async () => {
    await migrateDatabase(databaseUrl);

    const pool = new Pool({ connectionString: databaseUrl });

    try {
      const columns = await pool.query<{
        column_name: string;
        data_type: string;
        table_name: string;
      }>(
        `
          select table_name, column_name, data_type
          from information_schema.columns
          where table_schema = 'public'
            and table_name in ('community_incidents', 'pending_agreements', 'community_proposals')
          order by table_name, ordinal_position
        `,
      );
      const constraints = await pool.query<{
        constraint_name: string;
        constraint_type: string;
        delete_rule: string | null;
        table_name: string;
      }>(
        `
          select
            tc.table_name,
            tc.constraint_name,
            tc.constraint_type,
            rc.delete_rule
          from information_schema.table_constraints tc
          left join information_schema.referential_constraints rc
            on rc.constraint_schema = tc.constraint_schema
           and rc.constraint_name = tc.constraint_name
          where tc.table_schema = 'public'
            and tc.table_name in ('community_incidents', 'pending_agreements', 'community_proposals')
            and tc.constraint_type in ('PRIMARY KEY', 'FOREIGN KEY')
          order by tc.table_name, tc.constraint_type, tc.constraint_name
        `,
      );

      expect(groupColumnsByTable(columns.rows)).toEqual({
        community_incidents: [
          ['session_id', 'uuid'],
          ['id', 'character varying'],
          ['description', 'text'],
          ['type', 'character varying'],
          ['priority', 'character varying'],
          ['suggested_responsible', 'character varying'],
          ['suggested_notice', 'text'],
          ['status', 'character varying'],
          ['resolved_at', 'timestamp with time zone'],
          ['created_at', 'timestamp with time zone'],
          ['inserted_order', 'integer'],
        ],
        community_proposals: [
          ['session_id', 'uuid'],
          ['id', 'character varying'],
          ['description', 'text'],
          ['created_at', 'timestamp with time zone'],
          ['inserted_order', 'integer'],
        ],
        pending_agreements: [
          ['session_id', 'uuid'],
          ['id', 'character varying'],
          ['description', 'character varying'],
          ['assignee', 'character varying'],
          ['due_date', 'character varying'],
          ['normalized_signature', 'text'],
          ['created_at', 'timestamp with time zone'],
          ['inserted_order', 'integer'],
        ],
      });
      expect(constraints.rows).toEqual([
        {
          constraint_name: 'community_incidents_session_id_demo_sessions_id_fk',
          constraint_type: 'FOREIGN KEY',
          delete_rule: 'CASCADE',
          table_name: 'community_incidents',
        },
        {
          constraint_name: 'community_incidents_pkey',
          constraint_type: 'PRIMARY KEY',
          delete_rule: null,
          table_name: 'community_incidents',
        },
        {
          constraint_name: 'community_proposals_session_id_demo_sessions_id_fk',
          constraint_type: 'FOREIGN KEY',
          delete_rule: 'CASCADE',
          table_name: 'community_proposals',
        },
        {
          constraint_name: 'community_proposals_pkey',
          constraint_type: 'PRIMARY KEY',
          delete_rule: null,
          table_name: 'community_proposals',
        },
        {
          constraint_name: 'pending_agreements_session_id_demo_sessions_id_fk',
          constraint_type: 'FOREIGN KEY',
          delete_rule: 'CASCADE',
          table_name: 'pending_agreements',
        },
        {
          constraint_name: 'pending_agreements_pkey',
          constraint_type: 'PRIMARY KEY',
          delete_rule: null,
          table_name: 'pending_agreements',
        },
      ]);
    } finally {
      await pool.end();
    }
  }, 120_000);

  it('aplica restricciones y cascada del estado comunitario', async () => {
    await migrateDatabase(databaseUrl);

    const pool = new Pool({ connectionString: databaseUrl });
    const sessionId = '00000000-0000-4000-8000-000000000010';

    try {
      await insertSession(pool, {
        id: sessionId,
        requestsUsed: 0,
        requestsLimit: 3,
      });
      await expect(
        pool.query(
          `
            insert into community_incidents (
              session_id, id, description, type, priority, suggested_responsible,
              suggested_notice, status, resolved_at, created_at
            )
            values ($1, $2, $3, 'otro', 'media', 'Administracion', 'Aviso sugerido', 'pendiente', now(), now())
          `,
          [sessionId, 'incident-1', 'Descripcion valida'],
        ),
      ).rejects.toMatchObject({ constraint: 'community_incidents_pending_without_resolution' });
      await expect(
        pool.query(
          `
            insert into pending_agreements (
              session_id, id, description, created_at, normalized_signature
            )
            values ($1, $2, '', now(), '[""]')
          `,
          [sessionId, 'agreement-1'],
        ),
      ).rejects.toMatchObject({ constraint: 'pending_agreements_description_length' });
      await expect(
        pool.query(
          `
            insert into community_proposals (session_id, id, description, created_at)
            values ($1, $2, 'Corta', now())
          `,
          [sessionId, 'proposal-1'],
        ),
      ).rejects.toMatchObject({ constraint: 'community_proposals_description_length' });

      await insertCommunityState(pool, sessionId);
      await pool.query('delete from demo_sessions where id = $1', [sessionId]);

      await expect(countRows(pool, 'community_incidents')).resolves.toBe(0);
      await expect(countRows(pool, 'pending_agreements')).resolves.toBe(0);
      await expect(countRows(pool, 'community_proposals')).resolves.toBe(0);
    } finally {
      await pool.end();
    }
  }, 120_000);
});

function groupColumnsByTable(
  rows: ReadonlyArray<{
    readonly column_name: string;
    readonly data_type: string;
    readonly table_name: string;
  }>,
): Record<string, string[][]> {
  return rows.reduce<Record<string, string[][]>>((grouped, row) => {
    grouped[row.table_name] ??= [];
    grouped[row.table_name]!.push([row.column_name, row.data_type]);
    return grouped;
  }, {});
}

async function insertSession(
  pool: pg.Pool,
  input: {
    readonly expiresAt?: Date;
    readonly id: string;
    readonly requestsLimit: number;
    readonly requestsUsed: number;
  },
): Promise<void> {
  await pool.query(
    `
      insert into demo_sessions (id, created_at, last_seen_at, expires_at, requests_used, requests_limit)
      values ($1, $2, $3, $4, $5, $6)
    `,
    [
      input.id,
      new Date('2026-06-23T08:00:00.000Z'),
      new Date('2026-06-23T08:00:00.000Z'),
      input.expiresAt ?? new Date('2026-06-23T08:01:00.000Z'),
      input.requestsUsed,
      input.requestsLimit,
    ],
  );
}

async function insertCommunityState(pool: pg.Pool, sessionId: string): Promise<void> {
  await pool.query(
    `
      insert into community_incidents (
        session_id, id, description, type, priority, suggested_responsible,
        suggested_notice, status, resolved_at, created_at
      )
      values ($1, 'incident-2', 'Descripcion valida', 'otro', 'media', 'Administracion', 'Aviso sugerido', 'pendiente', null, now())
    `,
    [sessionId],
  );
  await pool.query(
    `
      insert into pending_agreements (
        session_id, id, description, created_at, normalized_signature
      )
      values ($1, 'agreement-2', 'Tarea pendiente', now(), '["tarea pendiente","",""]')
    `,
    [sessionId],
  );
  await pool.query(
    `
      insert into community_proposals (session_id, id, description, created_at)
      values ($1, 'proposal-2', 'Instalar sensores eficientes', now())
    `,
    [sessionId],
  );
}

async function countRows(pool: pg.Pool, tableName: string): Promise<number> {
  const result = await pool.query<{ count: string }>(`select count(*) from ${tableName}`);
  return Number(result.rows[0]?.count ?? 0);
}
