import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { CommunityProposal } from '../../domain/proposal/CommunityProposal.js';
import type { DemoSession } from '../../domain/session/DemoSession.js';
import { createPostgresPool } from '../database/createPostgresPool.js';
import { migrateDatabase } from '../database/migrateDatabase.js';
import { PostgresProposalRepository } from './PostgresProposalRepository.js';

const sessionA = '00000000-0000-4000-8000-000000000301';
const sessionB = '00000000-0000-4000-8000-000000000302';
const createdAt = new Date('2026-07-26T10:00:00.000Z');

describe('PostgresProposalRepository', () => {
  let container: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let databaseUrl: string;
  let pool: pg.Pool;
  let repository: PostgresProposalRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    databaseUrl = container.getConnectionUri();
    await migrateDatabase(databaseUrl);
  }, 120_000);

  beforeEach(async () => {
    pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
    repository = new PostgresProposalRepository(pool);
    await pool.query('truncate table demo_sessions cascade');
    await insertSession(pool, sessionA);
    await insertSession(pool, sessionB);
  });

  afterEach(async () => {
    if (!pool.ended) await pool.end();
  });

  afterAll(async () => {
    await container?.stop();
  });

  it('persiste, lista por sesion y conserva orden tras reabrir el pool', async () => {
    await repository.save(proposal({ id: 'proposal-1' }));
    await repository.save(proposal({ id: 'proposal-2', sessionId: sessionB }));
    await repository.save(proposal({ id: 'proposal-3' }));
    await pool.end();

    pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
    repository = new PostgresProposalRepository(pool);

    await expect(repository.listBySession(sessionA)).resolves.toEqual([
      proposal({ id: 'proposal-1' }),
      proposal({ id: 'proposal-3' }),
    ]);
    await expect(repository.listBySession(sessionB)).resolves.toEqual([
      proposal({ id: 'proposal-2', sessionId: sessionB }),
    ]);
  });

  it('permite descripciones duplicadas con identidades distintas y protege identidad repetida', async () => {
    await repository.save(proposal({ id: 'proposal-1' }));
    await repository.save(
      proposal({
        id: 'proposal-2',
        createdAt: new Date('2026-07-26T10:05:00.000Z'),
      }),
    );
    await repository.save(
      proposal({
        id: 'proposal-1',
        description: 'Texto que no reemplaza la propuesta inicial.',
      }),
    );

    await expect(repository.listBySession(sessionA)).resolves.toEqual([
      proposal({ id: 'proposal-1' }),
      proposal({
        id: 'proposal-2',
        createdAt: new Date('2026-07-26T10:05:00.000Z'),
      }),
    ]);
  });

  it('no pierde altas concurrentes con identidades distintas', async () => {
    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        repository.save(
          proposal({
            id: `proposal-${String(index).padStart(3, '0')}`,
            description: `Instalar mejora comunitaria numero ${index}`,
          }),
        ),
      ),
    );

    await expect(repository.listBySession(sessionA)).resolves.toHaveLength(8);
  });
});

function proposal(
  overrides: Partial<CommunityProposal> & { readonly id: string },
): CommunityProposal {
  return {
    id: overrides.id,
    sessionId: overrides.sessionId ?? sessionA,
    description: overrides.description ?? 'Instalar aparcabicis en el patio interior.',
    createdAt: overrides.createdAt ?? createdAt,
  };
}

async function insertSession(pool: pg.Pool, id: string): Promise<void> {
  const session: DemoSession = {
    id,
    createdAt,
    lastSeenAt: createdAt,
    expiresAt: new Date('2026-07-27T10:00:00.000Z'),
    requestsUsed: 0,
    requestsLimit: 120,
  };

  await pool.query(
    `
      insert into demo_sessions (id, created_at, last_seen_at, expires_at, requests_used, requests_limit)
      values ($1, $2, $3, $4, $5, $6)
    `,
    [
      session.id,
      session.createdAt,
      session.lastSeenAt,
      session.expiresAt,
      session.requestsUsed,
      session.requestsLimit,
    ],
  );
}
