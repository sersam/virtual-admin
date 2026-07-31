import { describe, expect, it } from 'vitest';
import type { AiActionQuotaRepository } from '../ports/AiActionQuotaRepository.js';
import { AiActionQuotaPolicy, toUtcDay } from './AiActionQuotaPolicy.js';

describe('AiActionQuotaPolicy', () => {
  it('calcula el dia UTC incluso alrededor de medianoche local', () => {
    expect(toUtcDay(new Date('2026-07-31T23:59:59.999Z'))).toBe('2026-07-31');
    expect(toUtcDay(new Date('2026-08-01T00:00:00.000Z'))).toBe('2026-08-01');
  });

  it('permite la accion cuando el repositorio reserva cuota', async () => {
    const policy = new AiActionQuotaPolicy({
      repository: { reserve: async () => ({ status: 'reserved' }) },
    });

    await expect(policy.reserve(validInput)).resolves.toEqual({ allowed: true });
  });

  it('devuelve el motivo publico cuando la sesion o la IP agotan cuota', async () => {
    const policy = new AiActionQuotaPolicy({
      repository: { reserve: async () => ({ status: 'rejected', reason: 'ip-quota' }) },
    });

    await expect(policy.reserve(validInput)).resolves.toEqual({
      allowed: false,
      fallbackReason: 'ip-quota',
    });
  });

  it('activa fallback cuando el repositorio de cuota no esta disponible', async () => {
    const repository: AiActionQuotaRepository = {
      reserve: async () => {
        throw new Error('database unavailable');
      },
    };
    const policy = new AiActionQuotaPolicy({ repository });

    await expect(policy.reserve(validInput)).resolves.toEqual({
      allowed: false,
      fallbackReason: 'quota-unavailable',
    });
  });
});

const validInput = {
  day: '2026-07-31',
  ipHash: 'ip-hash',
  ipLimit: 100,
  sessionHash: 'session-hash',
  sessionLimit: 20,
} as const;
