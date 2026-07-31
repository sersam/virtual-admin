import type pg from 'pg';
import { describe, expect, it } from 'vitest';
import { PostgresAiActionQuotaRepository } from './PostgresAiActionQuotaRepository.js';

describe('PostgresAiActionQuotaRepository', () => {
  it('escapa la columna reservada limit al reservar cuota', async () => {
    const queries: string[] = [];
    const client = {
      query: async (sql: string) => {
        queries.push(sql);
        failOnUnquotedLimit(sql);

        if (sql.includes('select scope')) {
          return {
            rows: [
              { limit: 20, scope: 'session', used: 0 },
              { limit: 100, scope: 'ip', used: 0 },
            ],
          };
        }

        return { rows: [] };
      },
      release: () => undefined,
    };
    const repository = new PostgresAiActionQuotaRepository({
      connect: async () => client,
    } as unknown as pg.Pool);

    await expect(
      repository.reserve({
        day: '2026-07-31',
        ipHash: 'b'.repeat(64),
        ipLimit: 100,
        sessionHash: 'a'.repeat(64),
        sessionLimit: 20,
      }),
    ).resolves.toEqual({ status: 'reserved' });

    expect(queries.join('\n')).toContain('"limit"');
  });
});

function failOnUnquotedLimit(sql: string): void {
  const compactSql = sql.replaceAll(/\s+/g, ' ').trim().toLowerCase();
  expect(compactSql).not.toContain(' used, limit)');
  expect(compactSql).not.toContain('select scope, used, limit ');
  expect(compactSql).not.toContain(' limit = excluded.limit');
}
