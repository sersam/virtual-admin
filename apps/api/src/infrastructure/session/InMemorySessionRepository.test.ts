import { describe, expect, it } from 'vitest';
import type { DemoSession } from '../../domain/session/DemoSession.js';
import { InMemorySessionRepository } from './InMemorySessionRepository.js';

const baseSession: DemoSession = {
  id: '00000000-0000-4000-8000-000000000001',
  createdAt: new Date('2026-06-23T08:00:00.000Z'),
  lastSeenAt: new Date('2026-06-23T08:00:00.000Z'),
  expiresAt: new Date('2026-06-23T08:01:00.000Z'),
  requestsUsed: 0,
  requestsLimit: 3,
};

describe('InMemorySessionRepository', () => {
  it('devuelve una sesión existente por id', async () => {
    const repository = new InMemorySessionRepository();
    await repository.save(baseSession);

    await expect(repository.findById(baseSession.id)).resolves.toEqual(baseSession);
  });

  it('devuelve undefined cuando el id no existe', async () => {
    const repository = new InMemorySessionRepository();

    await expect(
      repository.findById('00000000-0000-4000-8000-000000009999'),
    ).resolves.toBeUndefined();
  });

  it('crea una entrada nueva al guardar', async () => {
    const repository = new InMemorySessionRepository();

    await repository.save(baseSession);

    await expect(repository.findById(baseSession.id)).resolves.toEqual(baseSession);
  });

  it('actualiza una entrada existente al guardar el mismo id', async () => {
    const repository = new InMemorySessionRepository();
    const updatedSession = { ...baseSession, requestsUsed: 2 };

    await repository.save(baseSession);
    await repository.save(updatedSession);

    await expect(repository.findById(baseSession.id)).resolves.toEqual(updatedSession);
  });

  it('consume una petición de forma atómica y respeta el límite', async () => {
    const repository = new InMemorySessionRepository();
    const first = await repository.consumeRequest({
      createSessionId: () => baseSession.id,
      now: baseSession.createdAt,
      requestsLimit: 1,
      ttlMs: 60_000,
    });

    const second = await repository.consumeRequest({
      createSessionId: () => '00000000-0000-4000-8000-000000000002',
      now: baseSession.createdAt,
      requestsLimit: 1,
      sessionId: typeof first === 'string' ? undefined : first.id,
      ttlMs: 60_000,
    });

    expect(first).toMatchObject({ id: baseSession.id, requestsUsed: 1 });
    expect(second).toBe('limit_reached');
  });

  it('expulsa sesiones expiradas al intentar consumirlas', async () => {
    const repository = new InMemorySessionRepository();
    await repository.save(baseSession);

    const renewed = await repository.consumeRequest({
      createSessionId: () => '00000000-0000-4000-8000-000000000002',
      now: new Date('2026-06-23T08:01:01.000Z'),
      requestsLimit: 3,
      sessionId: baseSession.id,
      ttlMs: 60_000,
    });

    await expect(repository.findById(baseSession.id)).resolves.toBeUndefined();
    expect(renewed).toMatchObject({
      id: '00000000-0000-4000-8000-000000000002',
      requestsUsed: 1,
    });
  });
});
