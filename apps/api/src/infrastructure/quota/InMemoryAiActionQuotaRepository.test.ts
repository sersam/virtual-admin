import { describe, expect, it } from 'vitest';
import { InMemoryAiActionQuotaRepository } from './InMemoryAiActionQuotaRepository.js';

describe('InMemoryAiActionQuotaRepository', () => {
  it('reserva conjuntamente la cuota de sesion e IP', async () => {
    const repository = new InMemoryAiActionQuotaRepository();

    await expect(repository.reserve(baseInput)).resolves.toEqual({ status: 'reserved' });
    expect(repository.getUsedForTest('session', baseInput.day, baseInput.sessionHash)).toBe(1);
    expect(repository.getUsedForTest('ip', baseInput.day, baseInput.ipHash)).toBe(1);
  });

  it('prioriza el limite de sesion cuando ambos estan agotados', async () => {
    const repository = new InMemoryAiActionQuotaRepository();
    await repository.reserve({ ...baseInput, ipLimit: 1, sessionLimit: 1 });

    await expect(
      repository.reserve({ ...baseInput, ipLimit: 1, sessionLimit: 1 }),
    ).resolves.toEqual({
      reason: 'session-quota',
      status: 'rejected',
    });
  });

  it('bloquea por IP sin consumir una nueva unidad de sesion', async () => {
    const repository = new InMemoryAiActionQuotaRepository();
    await repository.reserve({ ...baseInput, ipLimit: 1, sessionHash: 'session-a' });

    await expect(
      repository.reserve({ ...baseInput, ipLimit: 1, sessionHash: 'session-b' }),
    ).resolves.toEqual({
      reason: 'ip-quota',
      status: 'rejected',
    });
    expect(repository.getUsedForTest('session', baseInput.day, 'session-b')).toBe(0);
  });

  it('reinicia la cuota al cambiar el dia UTC', async () => {
    const repository = new InMemoryAiActionQuotaRepository();
    await repository.reserve({ ...baseInput, sessionLimit: 1 });

    await expect(
      repository.reserve({ ...baseInput, day: '2026-08-01', sessionLimit: 1 }),
    ).resolves.toEqual({ status: 'reserved' });
  });
});

const baseInput = {
  day: '2026-07-31',
  ipHash: 'ip-hash',
  ipLimit: 100,
  sessionHash: 'session-hash',
  sessionLimit: 20,
} as const;
