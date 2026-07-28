import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createPendingAgreementSignature,
  type PendingAgreement,
} from '../../domain/meetingAgenda/PendingAgreement.js';
import type { DemoSession } from '../../domain/session/DemoSession.js';
import { createPostgresPool } from '../database/createPostgresPool.js';
import { migrateDatabase } from '../database/migrateDatabase.js';
import { PostgresPendingAgreementRepository } from './PostgresPendingAgreementRepository.js';

const sessionA = '00000000-0000-4000-8000-000000000201';
const sessionB = '00000000-0000-4000-8000-000000000202';
const createdAt = new Date('2026-06-23T08:00:00.000Z');

describe('PostgresPendingAgreementRepository', () => {
  let container: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let databaseUrl: string;
  let pool: pg.Pool;
  let repository: PostgresPendingAgreementRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();
    databaseUrl = container.getConnectionUri();
    await migrateDatabase(databaseUrl);
  }, 120_000);

  beforeEach(async () => {
    pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
    repository = new PostgresPendingAgreementRepository(pool);
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
    await repository.save(agreement({ id: 'pending-1', description: 'Revisar contrato' }));
    await repository.save(agreement({ id: 'pending-2', description: 'Pedir presupuesto' }));
    await repository.save(
      agreement({ id: 'pending-1', sessionId: sessionB, description: 'Revisar contrato' }),
    );
    await pool.end();

    pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
    repository = new PostgresPendingAgreementRepository(pool);

    await expect(repository.listBySession(sessionA)).resolves.toEqual([
      agreement({ id: 'pending-1', description: 'Revisar contrato' }),
      agreement({ id: 'pending-2', description: 'Pedir presupuesto' }),
    ]);
    await expect(repository.listBySession(sessionB)).resolves.toEqual([
      agreement({ id: 'pending-1', sessionId: sessionB, description: 'Revisar contrato' }),
    ]);
  });

  it('deduplica acuerdos equivalentes con save y los serializa por sesion', async () => {
    await Promise.all([
      repository.save(
        agreement({
          id: 'pending-1',
          description: ' Revisar contrato ',
          assignee: 'ANA',
          dueDate: '30 DE JUNIO',
        }),
      ),
      repository.save(
        agreement({
          id: 'pending-2',
          description: 'revisar contrato',
          assignee: 'Ana',
          dueDate: '30 de junio',
        }),
      ),
    ]);

    const stored = await repository.listBySession(sessionA);

    expect(stored).toHaveLength(1);
    expect(createPendingAgreementSignature(stored[0]!)).toBe(
      createPendingAgreementSignature(
        agreement({
          id: 'pending-expected',
          description: 'revisar contrato',
          assignee: 'ana',
          dueDate: '30 de junio',
        }),
      ),
    );
  });

  it('saveIfAbsent protege solo la identidad y permite firmas repetidas con otro id', async () => {
    await repository.saveIfAbsent(agreement({ id: 'pending-1', description: 'Revisar contrato' }));
    await repository.saveIfAbsent(agreement({ id: 'pending-1', description: 'No reemplaza' }));
    await repository.saveIfAbsent(
      agreement({ id: 'pending-2', description: ' revisar contrato ' }),
    );

    await expect(repository.listBySession(sessionA)).resolves.toEqual([
      agreement({ id: 'pending-1', description: 'Revisar contrato' }),
      agreement({ id: 'pending-2', description: ' revisar contrato ' }),
    ]);
  });

  it('no pierde altas concurrentes con identidades y firmas distintas', async () => {
    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        repository.save(
          agreement({
            id: `pending-${String(index).padStart(3, '0')}`,
            description: `Tarea pendiente ${index}`,
          }),
        ),
      ),
    );

    await expect(repository.listBySession(sessionA)).resolves.toHaveLength(8);
  });
});

function agreement(
  overrides: Partial<PendingAgreement> & { readonly id: string },
): PendingAgreement {
  return {
    id: overrides.id,
    sessionId: overrides.sessionId ?? sessionA,
    description: overrides.description ?? 'Revisar contrato',
    assignee: overrides.assignee,
    dueDate: overrides.dueDate,
    createdAt: overrides.createdAt ?? createdAt,
  };
}

async function insertSession(pool: pg.Pool, id: string): Promise<void> {
  const session: DemoSession = {
    id,
    createdAt,
    lastSeenAt: createdAt,
    expiresAt: new Date('2026-06-24T08:00:00.000Z'),
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
