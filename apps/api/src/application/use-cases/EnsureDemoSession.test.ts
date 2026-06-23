import { describe, expect, it } from 'vitest';
import type { DemoSession } from '../../domain/session/DemoSession.js';
import { InMemorySessionRepository } from '../../infrastructure/session/InMemorySessionRepository.js';
import { EnsureDemoSession, SessionUsageLimitReachedError } from './EnsureDemoSession.js';

function buildUseCase(initialNow: Date, requestsLimit = 3) {
  let now = initialNow;
  let idSequence = 0;
  const useCase = new EnsureDemoSession({
    clock: { now: () => now },
    ids: { randomId: () => `00000000-0000-4000-8000-${String(++idSequence).padStart(12, '0')}` },
    repository: new InMemorySessionRepository(),
    requestsLimit,
    ttlMs: 60_000,
  });

  return {
    setNow: (next: Date) => {
      now = next;
    },
    useCase,
  };
}

describe('EnsureDemoSession', () => {
  it('crea una sesión cuando no existe cookie previa', async () => {
    const { useCase } = buildUseCase(new Date('2026-06-23T08:00:00.000Z'));

    const session = await useCase.execute();

    expect(session.id).toBe('00000000-0000-4000-8000-000000000001');
    expect(session.requestsUsed).toBe(1);
  });

  it('reutiliza sesiones válidas manteniendo aislamiento por id', async () => {
    const { useCase } = buildUseCase(new Date('2026-06-23T08:00:00.000Z'));
    const first = await useCase.execute();
    const same = await useCase.execute(first.id);
    const another = await useCase.execute();

    expect(same.id).toBe(first.id);
    expect(same.requestsUsed).toBe(2);
    expect(another.id).not.toBe(first.id);
  });

  it('bloquea sesiones que agotan el cupo', async () => {
    const { useCase } = buildUseCase(new Date('2026-06-23T08:00:00.000Z'), 1);
    const session: DemoSession = await useCase.execute();

    await expect(useCase.execute(session.id)).rejects.toBeInstanceOf(SessionUsageLimitReachedError);
  });

  it('crea una sesión nueva cuando la sesión previa ha expirado', async () => {
    const { setNow, useCase } = buildUseCase(new Date('2026-06-23T08:00:00.000Z'));
    const first = await useCase.execute();

    setNow(new Date('2026-06-23T08:01:01.000Z'));
    const renewed = await useCase.execute(first.id);

    expect(renewed.id).not.toBe(first.id);
    expect(renewed.requestsUsed).toBe(1);
  });

  it('evita que dos consumos concurrentes superen el cupo de sesión', async () => {
    const { useCase } = buildUseCase(new Date('2026-06-23T08:00:00.000Z'), 2);
    const session = await useCase.execute();

    const results = await Promise.allSettled([
      useCase.execute(session.id),
      useCase.execute(session.id),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1);
  });
});
