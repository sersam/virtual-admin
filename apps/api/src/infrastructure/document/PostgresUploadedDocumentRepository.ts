import type pg from 'pg';
import type { UploadedDocumentRepository } from '../../application/ports/UploadedDocumentRepository.js';
import type { UploadedCommunityDocument } from '../../domain/document/UploadedCommunityDocument.js';

interface UploadedDocumentRow {
  readonly content: Buffer;
  readonly content_type: 'application/pdf';
  readonly document_url: string;
  readonly filename: string;
  readonly id: string;
  readonly session_id: string;
  readonly size_bytes: number;
  readonly text_content: string;
  readonly title: string;
  readonly uploaded_at: Date;
}

export class PostgresUploadedDocumentRepository implements UploadedDocumentRepository {
  constructor(private readonly pool: pg.Pool) {}

  async listBySession(sessionId: string): Promise<UploadedCommunityDocument[]> {
    const result = await this.pool.query<UploadedDocumentRow>(
      `
        select
          id,
          session_id::text as session_id,
          title,
          filename,
          content_type,
          size_bytes,
          uploaded_at,
          document_url,
          text_content,
          content
        from uploaded_documents
        where session_id = $1
        order by inserted_order asc
      `,
      [sessionId],
    );

    return result.rows.map(mapUploadedDocumentRow);
  }

  async save(document: UploadedCommunityDocument): Promise<void> {
    await this.pool.query(
      `
        insert into uploaded_documents (
          session_id, id, title, filename, content_type, size_bytes,
          uploaded_at, document_url, text_content, content
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        on conflict (session_id, id) do nothing
      `,
      [
        document.sessionId,
        document.id,
        document.title,
        document.filename,
        document.contentType,
        document.sizeBytes,
        document.uploadedAt,
        document.documentUrl,
        document.textContent,
        Buffer.from(document.content),
      ],
    );
  }
}

function mapUploadedDocumentRow(row: UploadedDocumentRow): UploadedCommunityDocument {
  return {
    id: row.id,
    sessionId: row.session_id,
    title: row.title,
    filename: row.filename,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    uploadedAt: row.uploaded_at,
    documentUrl: row.document_url,
    content: row.content,
    textContent: row.text_content,
  };
}
