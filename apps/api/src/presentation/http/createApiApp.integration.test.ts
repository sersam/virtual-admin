import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { DemoSession } from '../../domain/session/DemoSession.js';
import { InMemorySessionRepository } from '../../infrastructure/session/InMemorySessionRepository.js';
import { createApiApp } from './createApiApp.js';

function buildApp(requestsLimit = 3) {
  let idSequence = 0;
  return createApiApp({
    clock: { now: () => new Date('2026-06-23T08:00:00.000Z') },
    cookieSecret: 'test-secret',
    ids: { randomId: () => `00000000-0000-4000-8000-${String(++idSequence).padStart(12, '0')}` },
    repository: new InMemorySessionRepository(),
    requestsLimit,
    ttlMs: 60_000,
    version: 'test',
  });
}

describe('createApiApp', () => {
  it('expone un healthcheck validado', async () => {
    const response = await request(buildApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'administrador-virtual-api',
      version: 'test',
    });
  });

  it('crea cookies firmadas y reutiliza la sesión del mismo navegador', async () => {
    const agent = request.agent(buildApp());
    const first = await agent.get('/api/session');
    const second = await agent.get('/api/session');

    expect(first.status).toBe(200);
    expect(first.headers['set-cookie']?.[0]).toContain('va_session=');
    expect(second.body.session.id).toBe(first.body.session.id);
    expect(second.body.session.requestsUsed).toBe(2);
  });

  it('marca la cookie como segura cuando se configura para producción', async () => {
    let idSequence = 0;
    const app = createApiApp({
      clock: { now: () => new Date('2026-06-23T08:00:00.000Z') },
      cookieSecret: 'test-secret',
      ids: { randomId: () => `00000000-0000-4000-8000-${String(++idSequence).padStart(12, '0')}` },
      repository: new InMemorySessionRepository(),
      requestsLimit: 3,
      secureCookies: true,
      ttlMs: 60_000,
      version: 'test',
    });

    const response = await request(app).get('/api/session');

    expect(response.headers['set-cookie']?.[0]).toContain('Secure');
  });

  it('mantiene aisladas dos sesiones sin cookie compartida', async () => {
    const app = buildApp();
    const first = await request(app).get('/api/session');
    const second = await request(app).get('/api/session');

    expect(first.body.session.id).not.toBe(second.body.session.id);
  });

  it('limita el uso de una sesión demo', async () => {
    const agent = request.agent(buildApp(1));
    await agent.get('/api/session').expect(200);
    const limited = await agent.get('/api/session');

    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('SESSION_LIMIT_REACHED');
  });

  it('normaliza rutas no encontradas y errores inesperados', async () => {
    const notFound = await request(buildApp()).get('/api/desconocida');
    const failingApp = createApiApp({
      clock: { now: () => new Date('2026-06-23T08:00:00.000Z') },
      cookieSecret: 'test-secret',
      ids: { randomId: () => '00000000-0000-4000-8000-000000000001' },
      repository: {
        consumeRequest: async () => {
          throw new Error('database unavailable');
        },
        findById: async () => undefined,
        save: async (session: DemoSession) => {
          void session;
        },
      },
      requestsLimit: 3,
      ttlMs: 60_000,
      version: 'test',
    });
    const failed = await request(failingApp).get('/api/session');

    expect(notFound.status).toBe(404);
    expect(notFound.body.error.code).toBe('NOT_FOUND');
    expect(failed.status).toBe(500);
    expect(failed.body.error.code).toBe('INTERNAL_ERROR');
  });
});
