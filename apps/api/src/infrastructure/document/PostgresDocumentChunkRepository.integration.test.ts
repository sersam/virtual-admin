import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPostgresPool } from '../database/createPostgresPool.js';
import { migrateDatabase } from '../database/migrateDatabase.js';
import { PostgresDocumentChunkRepository } from './PostgresDocumentChunkRepository.js';

describe('PostgresDocumentChunkRepository', () => {
  let container: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let databaseUrl: string;
  let pool: pg.Pool;
  let repository: PostgresDocumentChunkRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();
    databaseUrl = container.getConnectionUri();
    await migrateDatabase(databaseUrl);
    pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
    repository = new PostgresDocumentChunkRepository(pool);
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  it('persiste chunks globales de forma idempotente y reemplaza versiones cambiadas', async () => {
    await repository.replaceDocumentChunks({
      chunks: [
        chunk({ id: 'global-doc:0', content: 'Piscina abierta', embedding: [1, 0, 0] }),
        chunk({
          id: 'global-doc:1',
          chunkIndex: 1,
          content: 'Garaje cerrado',
          embedding: [0, 1, 0],
        }),
      ],
      documentFingerprint: 'fingerprint-v1',
      documentId: 'global-doc',
      embeddingModel: 'test-model',
    });
    await repository.replaceDocumentChunks({
      chunks: [chunk({ id: 'global-doc:0', content: 'Piscina abierta', embedding: [1, 0, 0] })],
      documentFingerprint: 'fingerprint-v2',
      documentId: 'global-doc',
      embeddingModel: 'test-model',
    });

    await expect(
      repository.listIndexedDocuments({ embeddingModel: 'test-model' }),
    ).resolves.toEqual([
      {
        documentFingerprint: 'fingerprint-v2',
        documentId: 'global-doc',
        embeddingModel: 'test-model',
      },
    ]);
    await expect(countRows(pool, 'document_chunks')).resolves.toBe(1);
  });

  it('aisla chunks de sesion y los elimina en cascada', async () => {
    const sessionId = '00000000-0000-4000-8000-000000000171';
    await insertSession(pool, sessionId);
    await repository.replaceDocumentChunks({
      chunks: [
        chunk({
          documentId: 'upload-doc',
          id: 'upload-doc:0',
          sessionId,
          title: 'Contrato subido',
          type: 'adjunto',
        }),
      ],
      documentFingerprint: 'upload-fingerprint',
      documentId: 'upload-doc',
      embeddingModel: 'test-model',
      sessionId,
    });

    await expect(
      repository.listIndexedDocuments({ embeddingModel: 'test-model', sessionId }),
    ).resolves.toEqual([
      expect.objectContaining({
        documentFingerprint: 'upload-fingerprint',
        documentId: 'upload-doc',
        sessionId,
      }),
    ]);

    await pool.query('delete from demo_sessions where id = $1', [sessionId]);

    await expect(countRows(pool, 'document_chunks')).resolves.toBe(1);
  });

  it('busca vecinos por coseno, alcance global o sesion y score normalizado', async () => {
    const sessionId = '00000000-0000-4000-8000-000000000172';
    await insertSession(pool, sessionId);
    await repository.replaceDocumentChunks({
      chunks: [
        chunk({ id: 'semantic-global:0', documentId: 'semantic-global', embedding: [1, 0, 0] }),
      ],
      documentFingerprint: 'semantic-global-v1',
      documentId: 'semantic-global',
      embeddingModel: 'test-model',
    });
    await repository.replaceDocumentChunks({
      chunks: [
        chunk({
          documentId: 'semantic-session',
          id: 'semantic-session:0',
          sessionId,
          title: 'Factura subido',
          type: 'adjunto',
          embedding: [0.99, 0.01, 0],
        }),
      ],
      documentFingerprint: 'semantic-session-v1',
      documentId: 'semantic-session',
      embeddingModel: 'test-model',
      sessionId,
    });

    await expect(
      repository.searchNearest({
        embedding: [1, 0, 0],
        embeddingModel: 'test-model',
        limit: 5,
        sessionId,
      }),
    ).resolves.toEqual([
      expect.objectContaining({ documentId: 'semantic-global', score: 1 }),
      expect.objectContaining({ documentId: 'semantic-session', score: expect.any(Number) }),
    ]);
  });
});

function chunk(
  overrides: Partial<
    Parameters<PostgresDocumentChunkRepository['replaceDocumentChunks']>[0]['chunks'][number]
  > = {},
): Parameters<PostgresDocumentChunkRepository['replaceDocumentChunks']>[0]['chunks'][number] {
  return {
    chunkIndex: 0,
    content: 'Contenido del chunk',
    documentFingerprint: overrides.documentFingerprint ?? 'fingerprint-v1',
    documentId: overrides.documentId ?? 'global-doc',
    documentUrl: '/documents/documento.pdf',
    embedding: overrides.embedding ?? [1, 0, 0],
    embeddingModel: 'test-model',
    id: overrides.id ?? 'global-doc:0',
    section: 'Seccion',
    title: overrides.title ?? 'Documento',
    type: overrides.type ?? 'normas',
    ...overrides,
  };
}

async function insertSession(pool: pg.Pool, sessionId: string): Promise<void> {
  await pool.query(
    `
      insert into demo_sessions (id, created_at, last_seen_at, expires_at, requests_used, requests_limit)
      values ($1, now(), now(), now() + interval '1 hour', 0, 3)
    `,
    [sessionId],
  );
}

async function countRows(pool: pg.Pool, tableName: string): Promise<number> {
  const result = await pool.query<{ count: string }>(`select count(*) from ${tableName}`);
  return Number(result.rows[0]?.count ?? 0);
}
