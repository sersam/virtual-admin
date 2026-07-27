import type pg from 'pg';
import type {
  ConsumeSessionInput,
  ConsumeSessionResult,
  SessionRepository,
} from '../../application/ports/SessionRepository.js';
import {
  createDemoSession,
  sessionHasReachedLimit,
  sessionIsExpired,
  touchDemoSession,
  type DemoSession,
} from '../../domain/session/DemoSession.js';

interface SessionRow {
  readonly id: string;
  readonly created_at: Date;
  readonly last_seen_at: Date;
  readonly expires_at: Date;
  readonly requests_used: number;
  readonly requests_limit: number;
}

export class PostgresSessionRepository implements SessionRepository {
  constructor(private readonly pool: pg.Pool) {}

  async consumeRequest(input: ConsumeSessionInput): Promise<ConsumeSessionResult> {
    const client = await this.pool.connect();

    try {
      await client.query('begin');
      const reusable = await this.findReusableSessionForUpdate(client, input);
      const session = reusable ?? this.createSession(input);

      if (sessionHasReachedLimit(session)) {
        await client.query('commit');
        return 'limit_reached';
      }

      const touched = touchDemoSession(session, input.now);
      await this.upsertWithClient(client, touched);
      await client.query('commit');

      return touched;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<DemoSession | undefined> {
    const result = await this.pool.query<SessionRow>(
      `
        select id, created_at, last_seen_at, expires_at, requests_used, requests_limit
        from demo_sessions
        where id::text = $1
      `,
      [id],
    );

    return result.rows[0] ? mapSessionRow(result.rows[0]) : undefined;
  }

  async save(session: DemoSession): Promise<void> {
    await this.upsertWithPool(session);
  }

  private async findReusableSessionForUpdate(
    client: pg.PoolClient,
    input: ConsumeSessionInput,
  ): Promise<DemoSession | undefined> {
    if (!input.sessionId) return undefined;

    const result = await client.query<SessionRow>(
      `
        select id, created_at, last_seen_at, expires_at, requests_used, requests_limit
        from demo_sessions
        where id::text = $1
        for update
      `,
      [input.sessionId],
    );
    const session = result.rows[0] ? mapSessionRow(result.rows[0]) : undefined;

    if (!session) return undefined;

    if (sessionIsExpired(session, input.now)) {
      await client.query('delete from demo_sessions where id::text = $1', [input.sessionId]);
      return undefined;
    }

    return session;
  }

  private createSession(input: ConsumeSessionInput): DemoSession {
    return createDemoSession({
      id: input.createSessionId(),
      now: input.now,
      ttlMs: input.ttlMs,
      requestsLimit: input.requestsLimit,
    });
  }

  private async upsertWithPool(session: DemoSession): Promise<void> {
    await this.pool.query(upsertSessionSql, toSessionValues(session));
  }

  private async upsertWithClient(client: pg.PoolClient, session: DemoSession): Promise<void> {
    await client.query(upsertSessionSql, toSessionValues(session));
  }
}

const upsertSessionSql = `
  insert into demo_sessions (id, created_at, last_seen_at, expires_at, requests_used, requests_limit)
  values ($1, $2, $3, $4, $5, $6)
  on conflict (id) do update set
    created_at = excluded.created_at,
    last_seen_at = excluded.last_seen_at,
    expires_at = excluded.expires_at,
    requests_used = excluded.requests_used,
    requests_limit = excluded.requests_limit
`;

function toSessionValues(session: DemoSession): unknown[] {
  return [
    session.id,
    session.createdAt,
    session.lastSeenAt,
    session.expiresAt,
    session.requestsUsed,
    session.requestsLimit,
  ];
}

function mapSessionRow(row: SessionRow): DemoSession {
  return {
    id: row.id,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
    requestsUsed: row.requests_used,
    requestsLimit: row.requests_limit,
  };
}
