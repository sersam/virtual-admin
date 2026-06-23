import { describe, expect, it } from 'vitest';
import { createLocalDemoSession } from './localDemoSession';

describe('createLocalDemoSession', () => {
  it('devuelve una sesión determinista validable como fallback', () => {
    const session = createLocalDemoSession();

    expect(session.mode).toBe('local-demo');
    expect(session.session.id).toBe('49fa210a-1189-4f4f-8d7a-8f832f3c1ec1');
    expect(session.session.requestsLimit).toBeGreaterThan(session.session.requestsUsed);
  });
});
