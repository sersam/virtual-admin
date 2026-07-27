import type pg from 'pg';
import type { ProposalRepository } from '../../application/ports/ProposalRepository.js';
import type { CommunityProposal } from '../../domain/proposal/CommunityProposal.js';

interface ProposalRow {
  readonly id: string;
  readonly session_id: string;
  readonly description: string;
  readonly created_at: Date;
}

export class PostgresProposalRepository implements ProposalRepository {
  constructor(private readonly pool: pg.Pool) {}

  async listBySession(sessionId: string): Promise<CommunityProposal[]> {
    const result = await this.pool.query<ProposalRow>(
      `
        select id, session_id::text as session_id, description, created_at
        from community_proposals
        where session_id = $1
        order by inserted_order asc
      `,
      [sessionId],
    );

    return result.rows.map(mapProposalRow);
  }

  async save(proposal: CommunityProposal): Promise<void> {
    await this.pool.query(
      `
        insert into community_proposals (session_id, id, description, created_at)
        values ($1, $2, $3, $4)
        on conflict (session_id, id) do nothing
      `,
      [proposal.sessionId, proposal.id, proposal.description, proposal.createdAt],
    );
  }
}

function mapProposalRow(row: ProposalRow): CommunityProposal {
  return {
    id: row.id,
    sessionId: row.session_id,
    description: row.description,
    createdAt: row.created_at,
  };
}
