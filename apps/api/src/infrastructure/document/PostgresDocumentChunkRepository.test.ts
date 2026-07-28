import { describe, expect, it } from 'vitest';
import type pg from 'pg';
import { PostgresDocumentChunkRepository } from './PostgresDocumentChunkRepository.js';

describe('PostgresDocumentChunkRepository', () => {
  it('serializa vectores para pgvector', () => {
    expect(PostgresDocumentChunkRepository.toSqlVector([0.1, -2, 3.25])).toBe('[0.1,-2,3.25]');
  });

  it('rechaza vectores no finitos antes de enviarlos a PostgreSQL', () => {
    expect(() => PostgresDocumentChunkRepository.toSqlVector([0.1, Number.NaN])).toThrow(
      'El vector documental contiene valores invalidos.',
    );
  });

  it('bloquea el alcance documental dentro de la transaccion antes de reemplazar chunks', async () => {
    const client = new RecordingPgClient();
    const repository = new PostgresDocumentChunkRepository(
      new RecordingPgPool(client) as unknown as pg.Pool,
    );

    await repository.replaceDocumentChunks({
      chunks: [storedChunk({ id: 'doc-1:0' }), storedChunk({ id: 'doc-1:1', chunkIndex: 1 })],
      documentFingerprint: 'fingerprint-v1',
      documentId: 'doc-1',
      embeddingModel: 'test-model',
      sessionId: '00000000-0000-4000-8000-000000000171',
    });

    expect(client.queries[0]?.text).toBe('begin');
    expect(client.queries[1]).toEqual({
      text: 'select pg_advisory_xact_lock(hashtextextended($1, 0))',
      values: ['document_chunks:test-model:00000000-0000-4000-8000-000000000171:doc-1'],
    });
    expect(client.queries[2]?.text).toContain('delete from document_chunks');
    expect(client.queries[3]?.text).toContain('insert into document_chunks');
    expect(client.queries[3]?.text).toContain('$24::vector');
    expect(client.queries.at(-1)?.text).toBe('commit');
    expect(client.released).toBe(true);
  });

  it('confirma el reemplazo sin insertar cuando no hay chunks', async () => {
    const client = new RecordingPgClient();
    const repository = new PostgresDocumentChunkRepository(
      new RecordingPgPool(client) as unknown as pg.Pool,
    );

    await repository.replaceDocumentChunks({
      chunks: [],
      documentFingerprint: 'fingerprint-v1',
      documentId: 'doc-1',
      embeddingModel: 'test-model',
    });

    expect(client.queries.some((query) => query.text.includes('insert into document_chunks'))).toBe(
      false,
    );
    expect(client.queries.some((query) => query.text.includes('delete from document_chunks'))).toBe(
      true,
    );
    expect(client.queries.at(-1)?.text).toBe('commit');
    expect(client.released).toBe(true);
  });

  it('revierte y libera el cliente cuando falla el insert', async () => {
    const client = new RecordingPgClient({
      failOnText: 'insert into document_chunks',
      error: new Error('insert failed'),
    });
    const repository = new PostgresDocumentChunkRepository(
      new RecordingPgPool(client) as unknown as pg.Pool,
    );

    await expect(
      repository.replaceDocumentChunks({
        chunks: [storedChunk({ id: 'doc-1:0' })],
        documentFingerprint: 'fingerprint-v1',
        documentId: 'doc-1',
        embeddingModel: 'test-model',
      }),
    ).rejects.toThrow('insert failed');

    expect(client.queries.some((query) => query.text.includes('rollback'))).toBe(true);
    expect(client.queries.some((query) => query.text.includes('commit'))).toBe(false);
    expect(client.released).toBe(true);
  });

  it('parte inserts masivos para no superar el limite de parametros de PostgreSQL', async () => {
    const client = new RecordingPgClient();
    const repository = new PostgresDocumentChunkRepository(
      new RecordingPgPool(client) as unknown as pg.Pool,
    );

    await repository.replaceDocumentChunks({
      chunks: Array.from({ length: 5_001 }, (_, index) =>
        storedChunk({ id: `doc-1:${index}`, chunkIndex: index }),
      ),
      documentFingerprint: 'fingerprint-v1',
      documentId: 'doc-1',
      embeddingModel: 'test-model',
    });

    const inserts = client.queries.filter((query) =>
      query.text.includes('insert into document_chunks'),
    );
    expect(inserts).toHaveLength(2);
    expect(inserts[0]?.values).toHaveLength(60_000);
    expect(inserts[0]?.text).toContain('$60000::vector');
    expect(inserts[1]?.values).toHaveLength(12);
    expect(inserts[1]?.text).toContain('$12::vector');
  });
});

class RecordingPgPool {
  constructor(private readonly client: RecordingPgClient) {}

  async connect(): Promise<RecordingPgClient> {
    return this.client;
  }
}

class RecordingPgClient {
  readonly queries: {
    readonly text: string;
    readonly values?: readonly unknown[];
  }[] = [];
  released = false;

  constructor(
    private readonly failure?: {
      readonly error: Error;
      readonly failOnText: string;
    },
  ) {}

  async query(text: string, values?: readonly unknown[]): Promise<{ readonly rows: unknown[] }> {
    this.queries.push({ text, ...(values ? { values } : {}) });
    if (this.failure && text.includes(this.failure.failOnText)) throw this.failure.error;
    return { rows: [] };
  }

  release(): void {
    this.released = true;
  }
}

function storedChunk(
  overrides: Partial<
    Parameters<PostgresDocumentChunkRepository['replaceDocumentChunks']>[0]['chunks'][number]
  > = {},
): Parameters<PostgresDocumentChunkRepository['replaceDocumentChunks']>[0]['chunks'][number] {
  return {
    chunkIndex: 0,
    content: 'Contenido',
    documentFingerprint: 'fingerprint-v1',
    documentId: 'doc-1',
    documentUrl: '/documents/doc-1.pdf',
    embedding: [0.1, 0.2],
    embeddingModel: 'test-model',
    id: 'doc-1:0',
    section: 'Seccion',
    title: 'Documento',
    type: 'normas',
    ...overrides,
  };
}
