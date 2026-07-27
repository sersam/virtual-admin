import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { UploadedCommunityDocument } from '../../domain/document/UploadedCommunityDocument.js';
import type { DemoSession } from '../../domain/session/DemoSession.js';
import { createPostgresPool } from '../database/createPostgresPool.js';
import { migrateDatabase } from '../database/migrateDatabase.js';
import { PostgresUploadedDocumentRepository } from './PostgresUploadedDocumentRepository.js';

const sessionA = '00000000-0000-4000-8000-000000000401';
const sessionB = '00000000-0000-4000-8000-000000000402';
const uploadedAt = new Date('2026-07-27T08:30:00.000Z');

describe('PostgresUploadedDocumentRepository', () => {
  let container: Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;
  let databaseUrl: string;
  let pool: pg.Pool;
  let repository: PostgresUploadedDocumentRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    databaseUrl = container.getConnectionUri();
    await migrateDatabase(databaseUrl);
  }, 120_000);

  beforeEach(async () => {
    pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
    repository = new PostgresUploadedDocumentRepository(pool);
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

  it('persiste metadatos, texto y bytes por sesion tras reabrir el pool', async () => {
    await repository.save(document({ id: 'document-1' }));
    await repository.save(document({ id: 'document-2', sessionId: sessionB }));
    await repository.save(document({ id: 'document-3', title: 'Acta de abril' }));
    await pool.end();

    pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });
    repository = new PostgresUploadedDocumentRepository(pool);

    await expect(repository.listBySession(sessionA)).resolves.toEqual([
      document({ id: 'document-1' }),
      document({ id: 'document-3', title: 'Acta de abril' }),
    ]);
    await expect(repository.listBySession(sessionB)).resolves.toEqual([
      document({ id: 'document-2', sessionId: sessionB }),
    ]);
  });

  it('conserva la primera version ante una identidad repetida', async () => {
    await repository.save(document({ id: 'document-1' }));
    await repository.save(
      document({
        id: 'document-1',
        title: 'Acta modificada',
        textContent: 'Este texto no debe reemplazar la version original.',
      }),
    );

    await expect(repository.listBySession(sessionA)).resolves.toEqual([
      document({ id: 'document-1' }),
    ]);
  });

  it('no pierde altas concurrentes con identidades distintas', async () => {
    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        repository.save(
          document({
            id: `document-${String(index).padStart(3, '0')}`,
            title: `Documento ${index}`,
            textContent: `Contenido documental ${index}`,
          }),
        ),
      ),
    );

    await expect(repository.listBySession(sessionA)).resolves.toHaveLength(8);
  });
});

function document(
  overrides: Partial<UploadedCommunityDocument> & { readonly id: string },
): UploadedCommunityDocument {
  const content = overrides.content ?? Buffer.from(`%PDF-1.4 documento ${overrides.id}`);

  return {
    id: overrides.id,
    sessionId: overrides.sessionId ?? sessionA,
    title: overrides.title ?? 'Acta subida',
    filename: overrides.filename ?? 'acta-subida.pdf',
    contentType: overrides.contentType ?? 'application/pdf',
    sizeBytes: overrides.sizeBytes ?? content.byteLength,
    uploadedAt: overrides.uploadedAt ?? uploadedAt,
    documentUrl: overrides.documentUrl ?? `/api/documents/uploaded/${overrides.id}`,
    content,
    textContent: overrides.textContent ?? 'Texto extraido del acta subida.',
  };
}

async function insertSession(pool: pg.Pool, id: string): Promise<void> {
  const session: DemoSession = {
    id,
    createdAt: uploadedAt,
    lastSeenAt: uploadedAt,
    expiresAt: new Date('2026-07-28T08:30:00.000Z'),
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
