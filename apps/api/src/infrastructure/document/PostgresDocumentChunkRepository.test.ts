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

  async query(text: string, values?: readonly unknown[]): Promise<{ readonly rows: unknown[] }> {
    this.queries.push({ text, ...(values ? { values } : {}) });
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
