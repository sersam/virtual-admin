import { describe, expect, it } from 'vitest';
import { hashDailyAiQuotaIdentity } from './hashDailyAiQuotaIdentity.js';

describe('hashDailyAiQuotaIdentity', () => {
  it('genera hashes diarios estables sin incluir el valor original', () => {
    const first = hashDailyAiQuotaIdentity({
      day: '2026-07-31',
      secret: 'cookie-secret',
      value: '203.0.113.10',
    });
    const second = hashDailyAiQuotaIdentity({
      day: '2026-07-31',
      secret: 'cookie-secret',
      value: '203.0.113.10',
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain('203.0.113.10');
  });

  it('rota el hash al cambiar el dia UTC', () => {
    expect(
      hashDailyAiQuotaIdentity({
        day: '2026-07-31',
        secret: 'cookie-secret',
        value: 'session-id',
      }),
    ).not.toBe(
      hashDailyAiQuotaIdentity({
        day: '2026-08-01',
        secret: 'cookie-secret',
        value: 'session-id',
      }),
    );
  });
});
