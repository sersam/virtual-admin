import { describe, expect, it } from 'vitest';
import { ErrorResponseSchema, HealthResponseSchema, SessionResponseSchema } from './session';

const validSession = {
  id: '49fa210a-1189-4f4f-8d7a-8f832f3c1ec1',
  createdAt: '2026-06-23T08:00:00.000Z',
  lastSeenAt: '2026-06-23T08:01:00.000Z',
  expiresAt: '2026-06-23T09:00:00.000Z',
  requestsUsed: 1,
  requestsLimit: 120,
};

describe('session contracts', () => {
  it('valida una respuesta de sesión de la API', () => {
    expect(SessionResponseSchema.parse({ session: validSession, mode: 'api' })).toEqual({
      session: validSession,
      mode: 'api',
    });
  });

  it('rechaza identificadores no UUID y límites negativos', () => {
    expect(() =>
      SessionResponseSchema.parse({
        session: { ...validSession, id: 'sesion-manual', requestsLimit: -1 },
        mode: 'api',
      }),
    ).toThrow();
  });

  it('valida healthcheck y errores normalizados', () => {
    expect(
      HealthResponseSchema.parse({
        status: 'ok',
        service: 'administrador-virtual-api',
        version: '0.1.0',
      }),
    ).toMatchObject({ status: 'ok' });
    expect(
      ErrorResponseSchema.parse({
        error: { code: 'RATE_LIMITED', message: 'Demasiadas peticiones' },
      }),
    ).toMatchObject({ error: { code: 'RATE_LIMITED' } });
  });
});
