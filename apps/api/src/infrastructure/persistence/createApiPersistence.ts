import pg from 'pg';
import type { IncidentRepository } from '../../application/ports/IncidentRepository.js';
import type { PendingAgreementRepository } from '../../application/ports/PendingAgreementRepository.js';
import type { ProposalRepository } from '../../application/ports/ProposalRepository.js';
import type { SessionRepository } from '../../application/ports/SessionRepository.js';
import { InMemoryIncidentRepository } from '../incident/InMemoryIncidentRepository.js';
import { PostgresIncidentRepository } from '../incident/PostgresIncidentRepository.js';
import { InMemoryPendingAgreementRepository } from '../meetingAgenda/InMemoryPendingAgreementRepository.js';
import { PostgresPendingAgreementRepository } from '../meetingAgenda/PostgresPendingAgreementRepository.js';
import { InMemoryProposalRepository } from '../proposal/InMemoryProposalRepository.js';
import { PostgresProposalRepository } from '../proposal/PostgresProposalRepository.js';
import { InMemorySessionRepository } from '../session/InMemorySessionRepository.js';
import { PostgresSessionRepository } from '../session/PostgresSessionRepository.js';

const { Pool } = pg;
const defaultPostgresConnectionTimeoutMillis = 5_000;

interface CreateApiPersistenceOptions {
  readonly connectionTimeoutMillis?: number;
  readonly databaseUrl?: string;
}

export interface ApiPersistence {
  readonly incidentRepository: IncidentRepository;
  readonly pendingAgreementRepository: PendingAgreementRepository;
  readonly proposalRepository: ProposalRepository;
  readonly sessionRepository: SessionRepository;
  close(): Promise<void>;
}

export async function createApiPersistence(
  options: CreateApiPersistenceOptions,
): Promise<ApiPersistence> {
  if (!options.databaseUrl?.trim()) {
    return {
      incidentRepository: new InMemoryIncidentRepository(),
      pendingAgreementRepository: new InMemoryPendingAgreementRepository(),
      proposalRepository: new InMemoryProposalRepository(),
      sessionRepository: new InMemorySessionRepository(),
      close: async () => undefined,
    };
  }

  const pool = new Pool({
    connectionString: options.databaseUrl,
    connectionTimeoutMillis:
      options.connectionTimeoutMillis ?? defaultPostgresConnectionTimeoutMillis,
  });

  await validatePostgresApiSchema(pool);

  return {
    incidentRepository: new PostgresIncidentRepository(pool),
    pendingAgreementRepository: new PostgresPendingAgreementRepository(pool),
    proposalRepository: new PostgresProposalRepository(pool),
    sessionRepository: new PostgresSessionRepository(pool),
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
        proposals.inserted_order
      from demo_sessions sessions
      left join community_incidents incidents on incidents.session_id = sessions.id
      left join pending_agreements agreements on agreements.session_id = sessions.id
      left join community_proposals proposals on proposals.session_id = sessions.id
      limit 0
    `);
  } catch (error) {
    await pool.end();
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
    (error.code === '42P01' || error.code === '42703')
  );
}
