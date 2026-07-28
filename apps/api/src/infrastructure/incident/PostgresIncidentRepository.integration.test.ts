import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { CommunityIncident } from '../../domain/incident/CommunityIncident.js';
import type { DemoSession } from '../../domain/session/DemoSession.js';
import { createPostgresPool } from '../database/createPostgresPool.js';
import { migrateDatabase } from '../database/migrateDatabase.js';
import { PostgresIncidentRepository } from './PostgresIncidentRepository.js';

const sessionA = '00000000-0000-4000-8000-000000000101';
const sessionB = '00000000-0000-4000-8000-000000000102';
const createdAt = new Date('2026-06-27T10:00:00.000Z');
const notice = [
  'Estimados vecinos:',
  '',
  'Se ha registrado la siguiente incidencia: Hay una fuga de agua en el garaje.',
  '',
  'La administracion comunicara cualquier novedad relevante.',
].join('\n');

describe('PostgresIncidentRepository', () => {
  let container: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let databaseUrl: string;
  let pool: pg.Pool;
  let repository: PostgresIncidentRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();
    databaseUrl = container.getConnectionUri();
    await migrateDatabase(databaseUrl);
  }, 120_000);

  beforeEach(async () => {
    pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
    repository = new PostgresIncidentRepository(pool);
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

  it('persiste, lista por sesion y filtra respetando el orden tras reabrir el pool', async () => {
    await repository.save(incident({ id: 'inc-001', type: 'agua' }));
    await repository.save(incident({ id: 'inc-002', type: 'ascensor' }));
    await repository.save(incident({ id: 'inc-001', sessionId: sessionB, type: 'agua' }));
    await pool.end();

    pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
    repository = new PostgresIncidentRepository(pool);

    await expect(repository.listBySession(sessionA)).resolves.toEqual([
      incident({ id: 'inc-001', type: 'agua' }),
      incident({ id: 'inc-002', type: 'ascensor' }),
    ]);
    await expect(repository.listBySession(sessionA, { type: 'agua' })).resolves.toEqual([
      incident({ id: 'inc-001', type: 'agua' }),
    ]);
    await expect(repository.listBySession(sessionB)).resolves.toEqual([
      incident({ id: 'inc-001', sessionId: sessionB, type: 'agua' }),
    ]);
  });

  it('guarda de forma idempotente por identidad dentro de cada sesion', async () => {
    await repository.saveIfAbsent(incident({ id: 'inc-001', description: 'Descripcion original' }));
    await repository.saveIfAbsent(
      incident({ id: 'inc-001', description: 'Texto que no reemplaza' }),
    );
    await repository.saveIfAbsent(
      incident({ id: 'inc-001', sessionId: sessionB, description: 'Otra sesion valida' }),
    );

    await expect(repository.listBySession(sessionA)).resolves.toEqual([
      incident({ id: 'inc-001', description: 'Descripcion original' }),
    ]);
    await expect(repository.listBySession(sessionB)).resolves.toEqual([
      incident({ id: 'inc-001', sessionId: sessionB, description: 'Otra sesion valida' }),
    ]);
  });

  it('no pierde altas concurrentes con identidades distintas', async () => {
    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        repository.saveIfAbsent(incident({ id: `inc-${String(index).padStart(3, '0')}` })),
      ),
    );

    await expect(repository.listBySession(sessionA)).resolves.toHaveLength(8);
  });

  it('resuelve de forma atomica y conserva la primera fecha', async () => {
    await repository.save(incident({ id: 'inc-001' }));

    const firstResolution = new Date('2026-06-27T12:30:00.000Z');
    const secondResolution = new Date('2026-06-28T09:00:00.000Z');
    const [first, second] = await Promise.all([
      repository.resolve(sessionA, 'inc-001', firstResolution),
      repository.resolve(sessionA, 'inc-001', secondResolution),
    ]);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      id: 'inc-001',
      status: 'resuelta',
      resolvedAt: firstResolution,
    });
    await expect(repository.resolve(sessionB, 'inc-001', firstResolution)).resolves.toBeUndefined();
  });
});

function incident(
  overrides: Partial<CommunityIncident> & { readonly id: string },
): CommunityIncident {
  const base = {
    id: overrides.id,
    sessionId: overrides.sessionId ?? sessionA,
    description: overrides.description ?? 'Hay una fuga de agua en el garaje.',
    type: overrides.type ?? 'agua',
    priority: overrides.priority ?? 'alta',
    suggestedResponsible: overrides.suggestedResponsible ?? 'Fontaneria',
    suggestedNotice: overrides.suggestedNotice ?? notice,
    createdAt: overrides.createdAt ?? createdAt,
  };

  if (overrides.status === 'resuelta') {
    return {
      ...base,
      status: 'resuelta',
      resolvedAt: overrides.resolvedAt ?? new Date('2026-06-27T12:30:00.000Z'),
    };
  }

  return {
    ...base,
    status: overrides.status ?? 'pendiente',
    resolvedAt: null,
  };
}

async function insertSession(pool: pg.Pool, id: string): Promise<void> {
  const session: DemoSession = {
    id,
    createdAt,
    lastSeenAt: createdAt,
    expiresAt: new Date('2026-06-28T10:00:00.000Z'),
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
