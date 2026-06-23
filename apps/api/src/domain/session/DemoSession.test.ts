import { describe, expect, it } from 'vitest';
import {
  createDemoSession,
  sessionHasReachedLimit,
  sessionIsExpired,
  touchDemoSession,
} from './DemoSession.js';

describe('DemoSession', () => {
  it('crea una sesión demo con caducidad y límites', () => {
    const now = new Date('2026-06-23T08:00:00.000Z');
    const session = createDemoSession({
      id: 'session-id',
      now,
      ttlMs: 60_000,
      requestsLimit: 2,
    });

    expect(session.createdAt).toEqual(now);
    expect(session.expiresAt).toEqual(new Date('2026-06-23T08:01:00.000Z'));
    expect(sessionHasReachedLimit(session)).toBe(false);
  });

  it('detecta sesiones caducadas y consume usos al tocarlas', () => {
    const session = createDemoSession({
      id: 'session-id',
      now: new Date('2026-06-23T08:00:00.000Z'),
      ttlMs: 10,
      requestsLimit: 1,
    });
    const touched = touchDemoSession(session, new Date('2026-06-23T08:00:00.005Z'));

    expect(touched.requestsUsed).toBe(1);
    expect(sessionHasReachedLimit(touched)).toBe(true);
    expect(sessionIsExpired(session, new Date('2026-06-23T08:00:00.011Z'))).toBe(true);
  });

  it('rechaza sesiones sin duración o sin límite de uso', () => {
    const input = {
      id: 'session-id',
      now: new Date('2026-06-23T08:00:00.000Z'),
      ttlMs: 0,
      requestsLimit: 1,
    };

    expect(() => createDemoSession(input)).toThrow('positiva');
    expect(() => createDemoSession({ ...input, ttlMs: 1, requestsLimit: 0 })).toThrow('positivo');
  });
});
