import type pg from 'pg';
import type {
  IncidentListFilters,
  IncidentRepository,
} from '../../application/ports/IncidentRepository.js';
import type { CommunityIncident } from '../../domain/incident/CommunityIncident.js';

interface IncidentRow {
  readonly id: string;
  readonly session_id: string;
  readonly description: string;
  readonly type: CommunityIncident['type'];
  readonly priority: CommunityIncident['priority'];
  readonly suggested_responsible: string;
  readonly suggested_notice: string;
  readonly status: CommunityIncident['status'];
  readonly resolved_at: Date | null;
  readonly created_at: Date;
}

export class PostgresIncidentRepository implements IncidentRepository {
  constructor(private readonly pool: pg.Pool) {}

  async listBySession(
    sessionId: string,
    filters: IncidentListFilters = {},
  ): Promise<CommunityIncident[]> {
    const values: unknown[] = [sessionId];
    const typeFilter = filters.type ? 'and type = $2' : '';
    if (filters.type) values.push(filters.type);

    const result = await this.pool.query<IncidentRow>(
      `
        select
          id, session_id::text as session_id, description, type, priority, suggested_responsible,
          suggested_notice, status, resolved_at, created_at
        from community_incidents
        where session_id = $1
        ${typeFilter}
        order by inserted_order asc
      `,
      values,
    );

    return result.rows.map(mapIncidentRow);
  }

  async save(incident: CommunityIncident): Promise<void> {
    await this.saveIfAbsent(incident);
  }

  async saveIfAbsent(incident: CommunityIncident): Promise<void> {
    await this.pool.query(insertIncidentSql, toIncidentValues(incident));
  }

  async resolve(
    sessionId: string,
    incidentId: string,
    resolvedAt: Date,
  ): Promise<CommunityIncident | undefined> {
    const result = await this.pool.query<IncidentRow>(
      `
        with updated as (
          update community_incidents
          set status = 'resuelta', resolved_at = $3
          where session_id = $1
            and id = $2
            and status = 'pendiente'
          returning
            id, session_id::text as session_id, description, type, priority, suggested_responsible,
            suggested_notice, status, resolved_at, created_at
        )
        select *
        from updated
        union all
        select
          id, session_id::text as session_id, description, type, priority, suggested_responsible,
          suggested_notice, status, resolved_at, created_at
        from community_incidents
        where session_id = $1
          and id = $2
          and not exists (select 1 from updated)
        limit 1
      `,
      [sessionId, incidentId, resolvedAt],
    );

    return result.rows[0] ? mapIncidentRow(result.rows[0]) : undefined;
  }
}

const insertIncidentSql = `
  insert into community_incidents (
    session_id, id, description, type, priority, suggested_responsible,
    suggested_notice, status, resolved_at, created_at
  )
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  on conflict (session_id, id) do nothing
`;

function toIncidentValues(incident: CommunityIncident): unknown[] {
  return [
    incident.sessionId,
    incident.id,
    incident.description,
    incident.type,
    incident.priority,
    incident.suggestedResponsible,
    incident.suggestedNotice,
    incident.status,
    incident.resolvedAt,
    incident.createdAt,
  ];
}

function mapIncidentRow(row: IncidentRow): CommunityIncident {
  const base = {
    id: row.id,
    sessionId: row.session_id,
    description: row.description,
    type: row.type,
    priority: row.priority,
    suggestedResponsible: row.suggested_responsible,
    suggestedNotice: row.suggested_notice,
    createdAt: row.created_at,
  };

  if (row.status === 'resuelta') {
    return {
      ...base,
      status: 'resuelta',
      resolvedAt: row.resolved_at!,
    };
  }

  return {
    ...base,
    status: 'pendiente',
    resolvedAt: null,
  };
}
