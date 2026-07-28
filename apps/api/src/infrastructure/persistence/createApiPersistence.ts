import type pg from 'pg';
import type { DocumentChunkRepository } from '../../application/ports/DocumentChunkRepository.js';
import type { IncidentRepository } from '../../application/ports/IncidentRepository.js';
import type { PendingAgreementRepository } from '../../application/ports/PendingAgreementRepository.js';
import type { ProposalRepository } from '../../application/ports/ProposalRepository.js';
import type { SessionRepository } from '../../application/ports/SessionRepository.js';
import type { UploadedDocumentRepository } from '../../application/ports/UploadedDocumentRepository.js';
import { InMemoryUploadedDocumentRepository } from '../document/InMemoryUploadedDocumentRepository.js';
import { PostgresDocumentChunkRepository } from '../document/PostgresDocumentChunkRepository.js';
import { PostgresUploadedDocumentRepository } from '../document/PostgresUploadedDocumentRepository.js';
import { InMemoryIncidentRepository } from '../incident/InMemoryIncidentRepository.js';
import { PostgresIncidentRepository } from '../incident/PostgresIncidentRepository.js';
import { InMemoryPendingAgreementRepository } from '../meetingAgenda/InMemoryPendingAgreementRepository.js';
import { PostgresPendingAgreementRepository } from '../meetingAgenda/PostgresPendingAgreementRepository.js';
import { InMemoryProposalRepository } from '../proposal/InMemoryProposalRepository.js';
import { PostgresProposalRepository } from '../proposal/PostgresProposalRepository.js';
import { InMemorySessionRepository } from '../session/InMemorySessionRepository.js';
import { PostgresSessionRepository } from '../session/PostgresSessionRepository.js';
import { createPostgresPool } from '../database/createPostgresPool.js';

const defaultPostgresConnectionTimeoutMillis = 5_000;

interface CreateApiPersistenceOptions {
  readonly connectionTimeoutMillis?: number;
  readonly databaseUrl?: string;
}

export interface ApiPersistence {
  readonly documentChunkRepository?: DocumentChunkRepository;
  readonly incidentRepository: IncidentRepository;
  readonly pendingAgreementRepository: PendingAgreementRepository;
  readonly proposalRepository: ProposalRepository;
  readonly sessionRepository: SessionRepository;
  readonly uploadedDocumentRepository: UploadedDocumentRepository;
  close(): Promise<void>;
}

export async function createApiPersistence(
  options: CreateApiPersistenceOptions,
): Promise<ApiPersistence> {
  if (!options.databaseUrl?.trim()) {
    return {
      documentChunkRepository: undefined,
      incidentRepository: new InMemoryIncidentRepository(),
      pendingAgreementRepository: new InMemoryPendingAgreementRepository(),
      proposalRepository: new InMemoryProposalRepository(),
      sessionRepository: new InMemorySessionRepository(),
      uploadedDocumentRepository: new InMemoryUploadedDocumentRepository(),
      close: async () => undefined,
    };
  }

  const pool = createPostgresPool({
    connectionString: options.databaseUrl,
    connectionTimeoutMillis:
      options.connectionTimeoutMillis ?? defaultPostgresConnectionTimeoutMillis,
  });

  await validatePostgresApiSchema(pool);

  return {
    documentChunkRepository: new PostgresDocumentChunkRepository(pool),
    incidentRepository: new PostgresIncidentRepository(pool),
    pendingAgreementRepository: new PostgresPendingAgreementRepository(pool),
    proposalRepository: new PostgresProposalRepository(pool),
    sessionRepository: new PostgresSessionRepository(pool),
    uploadedDocumentRepository: new PostgresUploadedDocumentRepository(pool),
    close: async () => {
      if (!pool.ended) await pool.end();
    },
  };
}

async function validatePostgresApiSchema(pool: pg.Pool): Promise<void> {
  try {
    await pool.query(`
      select
        sessions.id,
        sessions.created_at,
        sessions.last_seen_at,
        sessions.expires_at,
        sessions.requests_used,
        sessions.requests_limit,
        incidents.session_id,
        incidents.id,
        incidents.description,
        incidents.type,
        incidents.priority,
        incidents.suggested_responsible,
        incidents.suggested_notice,
        incidents.status,
        incidents.resolved_at,
        incidents.created_at,
        incidents.inserted_order,
        agreements.session_id,
        agreements.id,
        agreements.description,
        agreements.assignee,
        agreements.due_date,
        agreements.normalized_signature,
        agreements.created_at,
        agreements.inserted_order,
        proposals.session_id,
        proposals.id,
        proposals.description,
        proposals.created_at,
        proposals.inserted_order,
        documents.session_id,
        documents.id,
        documents.title,
        documents.filename,
        documents.content_type,
        documents.size_bytes,
        documents.uploaded_at,
        documents.document_url,
        documents.text_content,
        documents.content,
        documents.inserted_order,
        chunks.id,
        chunks.session_id,
        chunks.document_id,
        chunks.document_fingerprint,
        chunks.chunk_index,
        chunks.title,
        chunks.type,
        chunks.section,
        chunks.document_url,
        chunks.content,
        chunks.embedding_model,
        chunks.embedding
      from demo_sessions sessions
      left join community_incidents incidents on incidents.session_id = sessions.id
      left join pending_agreements agreements on agreements.session_id = sessions.id
      left join community_proposals proposals on proposals.session_id = sessions.id
      left join uploaded_documents documents on documents.session_id = sessions.id
      left join document_chunks chunks on chunks.session_id = sessions.id
      limit 0
    `);
    const extension = await pool.query<{ extname: string }>(`
      select extname
      from pg_extension
      where extname = 'vector'
    `);
    const indexes = await pool.query<{ indexname: string }>(`
      select indexname
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'document_chunks'
        and indexname in ('document_chunks_embedding_hnsw_idx', 'document_chunks_scope_document_idx')
      order by indexname
    `);

    if (extension.rowCount !== 1 || indexes.rowCount !== 2) {
      throw new Error('El esquema PostgreSQL de la API no esta migrado.');
    }
  } catch (error) {
    await pool.end().catch(() => undefined);
    if (error instanceof Error && error.message.includes('no esta migrado')) {
      throw error;
    }
    if (isMissingApiSchemaError(error)) {
      throw new Error('El esquema PostgreSQL de la API no esta migrado.');
    }
    throw error;
  }
}

function isMissingApiSchemaError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === '42P01' || error.code === '42703' || error.code === '42704')
  );
}
