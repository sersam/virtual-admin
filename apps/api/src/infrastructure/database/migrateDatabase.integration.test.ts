import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPostgresPool } from './createPostgresPool.js';
import { getMigrationsFolder, migrateDatabase } from './migrateDatabase.js';

describe('migrateDatabase', () => {
  let container: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();
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

    const pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });

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

    const pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });

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

    const pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });

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
          ['due_on', 'date'],
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

    const pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
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

  it('crea la tabla de documentos subidos con clave compuesta y cascada', async () => {
    await migrateDatabase(databaseUrl);

    const pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });

    try {
      const columns = await pool.query<{
        column_name: string;
        data_type: string;
      }>(
        `
          select column_name, data_type
          from information_schema.columns
          where table_schema = 'public' and table_name = 'uploaded_documents'
          order by ordinal_position
        `,
      );
      const constraints = await pool.query<{
        constraint_name: string;
        constraint_type: string;
        delete_rule: string | null;
      }>(
        `
          select
            tc.constraint_name,
            tc.constraint_type,
            rc.delete_rule
          from information_schema.table_constraints tc
          left join information_schema.referential_constraints rc
            on rc.constraint_schema = tc.constraint_schema
           and rc.constraint_name = tc.constraint_name
          where tc.table_schema = 'public'
            and tc.table_name = 'uploaded_documents'
            and tc.constraint_type in ('PRIMARY KEY', 'FOREIGN KEY')
          order by tc.constraint_type, tc.constraint_name
        `,
      );
      const checks = await pool.query<{ constraint_name: string }>(
        `
          select constraint_name
          from information_schema.table_constraints
          where table_schema = 'public'
            and table_name = 'uploaded_documents'
            and constraint_type = 'CHECK'
            and constraint_name like 'uploaded_documents_%'
          order by constraint_name
        `,
      );

      expect(columns.rows).toEqual([
        { column_name: 'session_id', data_type: 'uuid' },
        { column_name: 'id', data_type: 'character varying' },
        { column_name: 'title', data_type: 'text' },
        { column_name: 'filename', data_type: 'text' },
        { column_name: 'content_type', data_type: 'text' },
        { column_name: 'size_bytes', data_type: 'integer' },
        { column_name: 'uploaded_at', data_type: 'timestamp with time zone' },
        { column_name: 'document_url', data_type: 'text' },
        { column_name: 'text_content', data_type: 'text' },
        { column_name: 'content', data_type: 'bytea' },
        { column_name: 'inserted_order', data_type: 'integer' },
      ]);
      expect(constraints.rows).toEqual([
        {
          constraint_name: 'uploaded_documents_session_id_demo_sessions_id_fk',
          constraint_type: 'FOREIGN KEY',
          delete_rule: 'CASCADE',
        },
        {
          constraint_name: 'uploaded_documents_pkey',
          constraint_type: 'PRIMARY KEY',
          delete_rule: null,
        },
      ]);
      expect(checks.rows.map(({ constraint_name }) => constraint_name)).toEqual([
        'uploaded_documents_content_length_matches_size',
        'uploaded_documents_content_not_empty',
        'uploaded_documents_content_type_pdf',
        'uploaded_documents_document_url_length',
        'uploaded_documents_filename_length',
        'uploaded_documents_size_bounds',
        'uploaded_documents_title_length',
      ]);
    } finally {
      await pool.end();
    }
  }, 120_000);

  it('aplica restricciones y cascada de documentos subidos', async () => {
    await migrateDatabase(databaseUrl);

    const pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
    const sessionId = '00000000-0000-4000-8000-000000000020';

    try {
      await insertSession(pool, {
        id: sessionId,
        requestsUsed: 0,
        requestsLimit: 3,
      });
      await expect(
        insertUploadedDocument(pool, sessionId, {
          content: Buffer.from('%PDF-1.4'),
          contentType: 'text/plain',
          id: 'document-1',
          sizeBytes: 8,
        }),
      ).rejects.toMatchObject({ constraint: 'uploaded_documents_content_type_pdf' });
      await expect(
        insertUploadedDocument(pool, sessionId, {
          content: Buffer.alloc(5 * 1024 * 1024 + 1, '%'),
          id: 'document-2',
          sizeBytes: 5 * 1024 * 1024 + 1,
        }),
      ).rejects.toMatchObject({ constraint: 'uploaded_documents_size_bounds' });
      await expect(
        insertUploadedDocument(pool, sessionId, {
          content: Buffer.from('%PDF-1.4'),
          id: 'document-3',
          sizeBytes: 4,
        }),
      ).rejects.toMatchObject({ constraint: 'uploaded_documents_content_length_matches_size' });

      await insertUploadedDocument(pool, sessionId, {
        content: Buffer.from('%PDF-1.4'),
        id: 'document-4',
        sizeBytes: 8,
      });
      await pool.query('delete from demo_sessions where id = $1', [sessionId]);

      await expect(countRows(pool, 'uploaded_documents')).resolves.toBe(0);
    } finally {
      await pool.end();
    }
  }, 120_000);

  it('crea chunks documentales vectoriales con pgvector e indice HNSW', async () => {
    await migrateDatabase(databaseUrl);

    const pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
    const sessionId = '00000000-0000-4000-8000-000000000030';

    try {
      const extension = await pool.query<{ extname: string }>(
        "select extname from pg_extension where extname = 'vector'",
      );
      const columns = await pool.query<{
        column_name: string;
        data_type: string;
        udt_name: string;
      }>(
        `
          select column_name, data_type, udt_name
          from information_schema.columns
          where table_schema = 'public' and table_name = 'document_chunks'
          order by ordinal_position
        `,
      );
      const vectorType = await pool.query<{ format_type: string }>(
        `
          select format_type(a.atttypid, a.atttypmod) as format_type
          from pg_attribute a
          join pg_class c on c.oid = a.attrelid
          where c.relname = 'document_chunks'
            and a.attname = 'embedding'
            and not a.attisdropped
        `,
      );
      const indexes = await pool.query<{ indexdef: string; indexname: string }>(
        `
          select indexname, indexdef
          from pg_indexes
          where schemaname = 'public' and tablename = 'document_chunks'
          order by indexname
        `,
      );

      expect(extension.rows).toEqual([{ extname: 'vector' }]);
      expect(columns.rows).toEqual([
        { column_name: 'id', data_type: 'character varying', udt_name: 'varchar' },
        { column_name: 'session_id', data_type: 'uuid', udt_name: 'uuid' },
        { column_name: 'document_id', data_type: 'character varying', udt_name: 'varchar' },
        { column_name: 'document_fingerprint', data_type: 'text', udt_name: 'text' },
        { column_name: 'chunk_index', data_type: 'integer', udt_name: 'int4' },
        { column_name: 'title', data_type: 'text', udt_name: 'text' },
        { column_name: 'type', data_type: 'text', udt_name: 'text' },
        { column_name: 'section', data_type: 'text', udt_name: 'text' },
        { column_name: 'document_url', data_type: 'text', udt_name: 'text' },
        { column_name: 'content', data_type: 'text', udt_name: 'text' },
        { column_name: 'embedding_model', data_type: 'text', udt_name: 'text' },
        { column_name: 'embedding', data_type: 'USER-DEFINED', udt_name: 'vector' },
      ]);
      expect(vectorType.rows).toEqual([{ format_type: 'vector(1536)' }]);
      expect(indexes.rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            indexdef: expect.stringContaining('USING hnsw (embedding vector_cosine_ops)'),
            indexname: 'document_chunks_embedding_hnsw_idx',
          }),
          expect.objectContaining({
            indexname: 'document_chunks_scope_document_idx',
          }),
        ]),
      );

      await insertSession(pool, { id: sessionId, requestsLimit: 3, requestsUsed: 0 });
      await insertDocumentChunk(pool, sessionId);
      await pool.query('delete from demo_sessions where id = $1', [sessionId]);

      await expect(countRows(pool, 'document_chunks')).resolves.toBe(0);
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

async function insertUploadedDocument(
  pool: pg.Pool,
  sessionId: string,
  input: {
    readonly content: Buffer;
    readonly contentType?: string;
    readonly id: string;
    readonly sizeBytes: number;
  },
): Promise<void> {
  await pool.query(
    `
      insert into uploaded_documents (
        session_id, id, title, filename, content_type, size_bytes,
        uploaded_at, document_url, text_content, content
      )
      values ($1, $2, 'Acta subida', 'acta.pdf', $3, $4, now(), '/api/documents/uploaded/document-1', 'Texto extraido', $5)
    `,
    [sessionId, input.id, input.contentType ?? 'application/pdf', input.sizeBytes, input.content],
  );
}

async function insertDocumentChunk(pool: pg.Pool, sessionId: string): Promise<void> {
  await pool.query(
    `
      insert into document_chunks (
        id, session_id, document_id, document_fingerprint, chunk_index,
        title, type, section, document_url, content, embedding_model, embedding
      )
      values (
        'chunk-1', $1, 'document-1', 'fingerprint-1', 0,
        'Documento', 'normas', 'Seccion', '/documents/documento.pdf',
        'Contenido', 'text-embedding-3-small', $2::vector
      )
    `,
    [sessionId, `[${Array.from({ length: 1536 }, () => 0).join(',')}]`],
  );
}
