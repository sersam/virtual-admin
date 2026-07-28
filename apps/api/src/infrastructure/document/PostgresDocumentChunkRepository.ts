import type pg from 'pg';
import type {
  DocumentChunkRepository,
  IndexedDocumentVersion,
  RetrievedDocumentChunk,
  StoredDocumentChunk,
} from '../../application/ports/DocumentChunkRepository.js';
import type { CommunityDocumentType } from '../../domain/document/CommunityDocument.js';

interface IndexedDocumentVersionRow {
  readonly document_fingerprint: string;
  readonly document_id: string;
  readonly embedding_model: string;
  readonly session_id: string | null;
}

interface RetrievedDocumentChunkRow {
  readonly chunk_index: number;
  readonly content: string;
  readonly document_id: string;
  readonly document_url: string;
  readonly score: number;
  readonly section: string;
  readonly title: string;
  readonly type: CommunityDocumentType;
}

export class PostgresDocumentChunkRepository implements DocumentChunkRepository {
  constructor(private readonly pool: pg.Pool) {}

  async listIndexedDocuments(params: {
    readonly embeddingModel: string;
    readonly sessionId?: string;
  }): Promise<IndexedDocumentVersion[]> {
    const result = await this.pool.query<IndexedDocumentVersionRow>(
      `
        select distinct on (session_id, document_id)
          session_id::text as session_id,
          document_id,
          document_fingerprint,
          embedding_model
        from document_chunks
        where embedding_model = $1
          and (session_id is null or session_id = $2)
        order by session_id, document_id, chunk_index asc
      `,
      [params.embeddingModel, params.sessionId ?? null],
    );

    return result.rows.map((row) => ({
      documentFingerprint: row.document_fingerprint,
      documentId: row.document_id,
      embeddingModel: row.embedding_model,
      ...(row.session_id ? { sessionId: row.session_id } : {}),
    }));
  }

  async replaceDocumentChunks(params: {
    readonly chunks: readonly StoredDocumentChunk[];
    readonly documentFingerprint: string;
    readonly documentId: string;
    readonly embeddingModel: string;
    readonly sessionId?: string;
  }): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('begin');
      await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [
        PostgresDocumentChunkRepository.toDocumentScopeLockKey(params),
      ]);
      await client.query(
        `
          delete from document_chunks
          where document_id = $1
            and embedding_model = $2
            and session_id is not distinct from $3::uuid
            and document_fingerprint <> $4
        `,
        [
          params.documentId,
          params.embeddingModel,
          params.sessionId ?? null,
          params.documentFingerprint,
        ],
      );

      await insertDocumentChunks(client, params.chunks);

      await client.query('commit');
    } catch (error) {
      await client.query('rollback').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async searchNearest(params: {
    readonly embedding: readonly number[];
    readonly embeddingModel: string;
    readonly limit: number;
    readonly sessionId?: string;
  }): Promise<RetrievedDocumentChunk[]> {
    const result = await this.pool.query<RetrievedDocumentChunkRow>(
      `
        select
          document_id,
          title,
          type,
          section,
          document_url,
          content,
          chunk_index,
          greatest(0, least(1, 1 - (embedding <=> $1::vector)))::float8 as score
        from document_chunks
        where embedding_model = $2
          and (session_id is null or session_id = $3)
        order by embedding <=> $1::vector
        limit $4
      `,
      [
        PostgresDocumentChunkRepository.toSqlVector(params.embedding),
        params.embeddingModel,
        params.sessionId ?? null,
        params.limit,
      ],
    );

    return result.rows.map((row) => ({
      chunkIndex: row.chunk_index,
      content: row.content,
      documentId: row.document_id,
      documentUrl: row.document_url,
      score: row.score,
      section: row.section,
      title: row.title,
      type: row.type,
    }));
  }

  static toSqlVector(vector: readonly number[]): string {
    if (vector.some((value) => !Number.isFinite(value))) {
      throw new Error('El vector documental contiene valores invalidos.');
    }
    return `[${vector.join(',')}]`;
  }

  static toDocumentScopeLockKey(params: {
    readonly documentId: string;
    readonly embeddingModel: string;
    readonly sessionId?: string;
  }): string {
    return `document_chunks:${params.embeddingModel}:${params.sessionId ?? 'global'}:${params.documentId}`;
  }
}

async function insertDocumentChunks(
  client: pg.PoolClient,
  chunks: readonly StoredDocumentChunk[],
): Promise<void> {
  if (chunks.length === 0) return;

  await client.query(
    `
      insert into document_chunks (
        id, session_id, document_id, document_fingerprint, chunk_index,
        title, type, section, document_url, content, embedding_model, embedding
      )
      values ${chunks.map(toInsertRow).join(', ')}
      on conflict (id) do nothing
    `,
    chunks.flatMap(toInsertParameters),
  );
}

function toInsertRow(_: StoredDocumentChunk, rowIndex: number): string {
  const firstParam = rowIndex * 12 + 1;
  const placeholders = Array.from({ length: 11 }, (_, index) => `$${firstParam + index}`);
  return `(${[...placeholders, `$${firstParam + 11}::vector`].join(', ')})`;
}

function toInsertParameters(chunk: StoredDocumentChunk): readonly unknown[] {
  return [
    chunk.id,
    chunk.sessionId ?? null,
    chunk.documentId,
    chunk.documentFingerprint,
    chunk.chunkIndex,
    chunk.title,
    chunk.type,
    chunk.section,
    chunk.documentUrl,
    chunk.content,
    chunk.embeddingModel,
    PostgresDocumentChunkRepository.toSqlVector(chunk.embedding),
  ];
}
