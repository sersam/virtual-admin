import type pg from 'pg';
import type { PendingAgreementRepository } from '../../application/ports/PendingAgreementRepository.js';
import {
  createPendingAgreementSignature,
  type PendingAgreement,
} from '../../domain/meetingAgenda/PendingAgreement.js';

interface PendingAgreementRow {
  readonly id: string;
  readonly session_id: string;
  readonly description: string;
  readonly assignee: string | null;
  readonly due_date: string | null;
  readonly created_at: Date;
}

export class PostgresPendingAgreementRepository implements PendingAgreementRepository {
  constructor(private readonly pool: pg.Pool) {}

  async listBySession(sessionId: string): Promise<PendingAgreement[]> {
    const result = await this.pool.query<PendingAgreementRow>(
      `
        select id, session_id::text as session_id, description, assignee, due_date, created_at
        from pending_agreements
        where session_id = $1
        order by inserted_order asc
      `,
      [sessionId],
    );

    return result.rows.map(mapPendingAgreementRow);
  }

  async save(pendingAgreement: PendingAgreement): Promise<void> {
    const client = await this.pool.connect();
    let rollbackFailed = false;

    try {
      await client.query('begin');
      await client.query('select id from demo_sessions where id = $1 for update', [
        pendingAgreement.sessionId,
      ]);

      const signature = createPendingAgreementSignature(pendingAgreement);
      const existing = await client.query(
        `
          select 1
          from pending_agreements
          where session_id = $1
            and normalized_signature = $2
          limit 1
        `,
        [pendingAgreement.sessionId, signature],
      );

      if (existing.rowCount === 0) {
        await client.query(insertPendingAgreementSql, [
          ...toPendingAgreementValues(pendingAgreement),
          signature,
        ]);
      }

      await client.query('commit');
    } catch (error) {
      try {
        await client.query('rollback');
      } catch {
        rollbackFailed = true;
      }
      throw error;
    } finally {
      client.release(rollbackFailed);
    }
  }

  async saveIfAbsent(pendingAgreement: PendingAgreement): Promise<void> {
    await this.pool.query(insertPendingAgreementSql, [
      ...toPendingAgreementValues(pendingAgreement),
      createPendingAgreementSignature(pendingAgreement),
    ]);
  }
}

const insertPendingAgreementSql = `
  insert into pending_agreements (
    session_id, id, description, assignee, due_date, created_at, normalized_signature
  )
  values ($1, $2, $3, $4, $5, $6, $7)
  on conflict (session_id, id) do nothing
`;

function toPendingAgreementValues(pendingAgreement: PendingAgreement): unknown[] {
  return [
    pendingAgreement.sessionId,
    pendingAgreement.id,
    pendingAgreement.description,
    pendingAgreement.assignee ?? null,
    pendingAgreement.dueDate ?? null,
    pendingAgreement.createdAt,
  ];
}

function mapPendingAgreementRow(row: PendingAgreementRow): PendingAgreement {
  return {
    id: row.id,
    sessionId: row.session_id,
    description: row.description,
    assignee: row.assignee ?? undefined,
    dueDate: row.due_date ?? undefined,
    createdAt: row.created_at,
  };
}
