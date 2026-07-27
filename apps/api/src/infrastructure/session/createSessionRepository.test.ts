import { describe, expect, it } from 'vitest';
import { InMemorySessionRepository } from './InMemorySessionRepository.js';
import { PostgresSessionRepository } from './PostgresSessionRepository.js';
import { createSessionRepository } from './createSessionRepository.js';

describe('createSessionRepository', () => {
  it('usa memoria cuando DATABASE_URL no existe', async () => {
    const persistence = createSessionRepository({});

    expect(persistence.repository).toBeInstanceOf(InMemorySessionRepository);
    await expect(persistence.close()).resolves.toBeUndefined();
  });

  it('usa memoria cuando DATABASE_URL esta vacia', async () => {
    const persistence = createSessionRepository({ databaseUrl: '   ' });

    expect(persistence.repository).toBeInstanceOf(InMemorySessionRepository);
    await expect(persistence.close()).resolves.toBeUndefined();
  });

  it('usa PostgreSQL cuando DATABASE_URL esta configurada sin activar fallback silencioso', async () => {
    const persistence = createSessionRepository({
      connectionTimeoutMillis: 50,
      databaseUrl: 'postgres://test:test@127.0.0.1:1/test',
    });

    expect(persistence.repository).toBeInstanceOf(PostgresSessionRepository);
    await expect(
      persistence.repository.findById('00000000-0000-4000-8000-000000000001'),
    ).rejects.toThrow();
    await persistence.close();
  });
});
