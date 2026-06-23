import { describe, expect, it } from 'vitest';
import type { DemoSession } from '../../domain/session/DemoSession.js';
import { InMemorySessionRepository } from '../../infrastructure/session/InMemorySessionRepository.js';
import { EnsureDemoSession, SessionUsageLimitReachedError } from './EnsureDemoSession.js';

function buildUseCase(now: Date, requestsLimit = 3) {
  let idSequence = 0;
  return new EnsureDemoSession({
    clock: { now: () => now },
    ids: { randomId: () => `00000000-0000-4000-8000-${String(++idSequence).padStart(12, '0')}` },
    repository: new InMemorySessionRepository(),
    requestsLimit,
    ttlMs: 60_000,
  });
}

describe('EnsureDemoSession', () => {
  it('crea una sesión cuando no existe cookie previa', async () => {
    const useCase = buildUseCase(new Date('2026-06-23T08:00:00.000Z'));

    const session = await useCase.execute();

    expect(session.id).toBe('00000000-0000-4000-8000-000000000001');
    expect(session.requestsUsed).toBe(1);
  });

  it('reutiliza sesiones válidas manteniendo aislamiento por id', async () => {
    const useCase = buildUseCase(new Date('2026-06-23T08:00:00.000Z'));
    const first = await useCase.execute();
    const same = await useCase.execute(first.id);
    const another = await useCase.execute();

    expect(same.id).toBe(first.id);
    expect(same.requestsUsed).toBe(2);
    expect(another.id).not.toBe(first.id);
  });

  it('bloquea sesiones que agotan el cupo', async () => {
    const useCase = buildUseCase(new Date('2026-06-23T08:00:00.000Z'), 1);
    const session: DemoSession = await useCase.execute();

    await expect(useCase.execute(session.id)).rejects.toBeInstanceOf(SessionUsageLimitReachedError);
  });
});
