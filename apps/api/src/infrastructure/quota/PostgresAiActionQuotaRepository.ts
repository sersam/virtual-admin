import type pg from 'pg';
import type {
  AiActionQuotaRepository,
  AiActionQuotaReservationInput,
  AiActionQuotaReservationResult,
} from '../../application/ports/AiActionQuotaRepository.js';

interface QuotaCounterRow {
  readonly limit: number;
  readonly scope: 'ip' | 'session';
  readonly used: number;
}

export class PostgresAiActionQuotaRepository implements AiActionQuotaRepository {
  constructor(private readonly pool: pg.Pool) {}

  async reserve(input: AiActionQuotaReservationInput): Promise<AiActionQuotaReservationResult> {
    const client = await this.pool.connect();

    try {
      await client.query('begin');
      await ensureCounter(client, {
        day: input.day,
        identityHash: input.sessionHash,
        limit: input.sessionLimit,
        scope: 'session',
      });
      await ensureCounter(client, {
        day: input.day,
        identityHash: input.ipHash,
        limit: input.ipLimit,
        scope: 'ip',
      });

      const counters = await selectCountersForUpdate(client, input);
      const sessionCounter = findCounter(counters, 'session');
      const ipCounter = findCounter(counters, 'ip');

      if (sessionCounter.used >= input.sessionLimit) {
        await client.query('commit');
        return { status: 'rejected', reason: 'session-quota' };
      }
      if (ipCounter.used >= input.ipLimit) {
        await client.query('commit');
        return { status: 'rejected', reason: 'ip-quota' };
      }

      await incrementCounters(client, input);
      await client.query('commit');
      return { status: 'reserved' };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}

async function ensureCounter(
  client: pg.PoolClient,
  input: {
    readonly day: string;
    readonly identityHash: string;
    readonly limit: number;
    readonly scope: 'ip' | 'session';
  },
): Promise<void> {
  await client.query(
    `
      insert into ai_action_quota_counters (scope, day, identity_hash, used, "limit")
      values ($1, $2, $3, 0, $4)
      on conflict (scope, day, identity_hash) do update set
        "limit" = excluded."limit"
    `,
    [input.scope, input.day, input.identityHash, input.limit],
  );
}

async function selectCountersForUpdate(
  client: pg.PoolClient,
  input: AiActionQuotaReservationInput,
): Promise<QuotaCounterRow[]> {
  const result = await client.query<QuotaCounterRow>(
    `
      select scope, used, "limit"
      from ai_action_quota_counters
      where day = $1
        and (
          (scope = 'session' and identity_hash = $2)
          or (scope = 'ip' and identity_hash = $3)
        )
      order by scope desc
      for update
    `,
    [input.day, input.sessionHash, input.ipHash],
  );
  return result.rows;
}

function findCounter(
  counters: readonly QuotaCounterRow[],
  scope: 'ip' | 'session',
): QuotaCounterRow {
  const counter = counters.find((candidate) => candidate.scope === scope);
  if (!counter) throw new Error(`No se pudo reservar la cuota IA de ${scope}.`);
  return counter;
}

async function incrementCounters(
  client: pg.PoolClient,
  input: AiActionQuotaReservationInput,
): Promise<void> {
  await client.query(
    `
      update ai_action_quota_counters
      set used = used + 1
      where day = $1
        and (
          (scope = 'session' and identity_hash = $2)
          or (scope = 'ip' and identity_hash = $3)
        )
    `,
    [input.day, input.sessionHash, input.ipHash],
  );
}
