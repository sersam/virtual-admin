import type pg from 'pg';
import { describe, expect, it, vi } from 'vitest';
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

  it('rechaza por cuota de sesion antes que por IP', async () => {
    const repository = new PostgresAiActionQuotaRepository(
      buildPool([
        { limit: 20, scope: 'session', used: 20 },
        { limit: 100, scope: 'ip', used: 100 },
      ]),
    );

    await expect(repository.reserve(baseInput)).resolves.toEqual({
      reason: 'session-quota',
      status: 'rejected',
    });
  });

  it('rechaza por cuota de IP sin incrementar contadores', async () => {
    const queries: string[] = [];
    const repository = new PostgresAiActionQuotaRepository(
      buildPool(
        [
          { limit: 20, scope: 'session', used: 0 },
          { limit: 100, scope: 'ip', used: 100 },
        ],
        queries,
      ),
    );

    await expect(repository.reserve(baseInput)).resolves.toEqual({
      reason: 'ip-quota',
      status: 'rejected',
    });
    expect(queries.some((query) => query.includes('set used = used + 1'))).toBe(false);
  });

  it('hace rollback y propaga el error si falta un contador bloqueado', async () => {
    const queries: string[] = [];
    const repository = new PostgresAiActionQuotaRepository(
      buildPool([{ limit: 20, scope: 'session', used: 0 }], queries),
    );

    await expect(repository.reserve(baseInput)).rejects.toThrow('No se pudo reservar la cuota IA');
    expect(queries).toContain('rollback');
  });

  it('hace rollback y propaga el error original si falla una query', async () => {
    const originalError = new Error('select failed');
    const rollback = vi.fn(async () => ({ rows: [] }));
    const release = vi.fn();
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql === 'rollback') return rollback();
        if (sql.includes('select scope')) throw originalError;
        return { rows: [] };
      }),
      release,
    };
    const repository = new PostgresAiActionQuotaRepository({
      connect: async () => client,
    } as unknown as pg.Pool);

    await expect(repository.reserve(baseInput)).rejects.toBe(originalError);
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });
});

const baseInput = {
  day: '2026-07-31',
  ipHash: 'b'.repeat(64),
  ipLimit: 100,
  sessionHash: 'a'.repeat(64),
  sessionLimit: 20,
} as const;

function buildPool(
  rows: Array<{ readonly limit: number; readonly scope: 'ip' | 'session'; readonly used: number }>,
  queries: string[] = [],
): pg.Pool {
  const client = {
    query: async (sql: string) => {
      queries.push(sql);
      failOnUnquotedLimit(sql);
      if (sql.includes('select scope')) return { rows };
      return { rows: [] };
    },
    release: () => undefined,
  };

  return { connect: async () => client } as unknown as pg.Pool;
}

function failOnUnquotedLimit(sql: string): void {
  const compactSql = sql.replaceAll(/\s+/g, ' ').trim().toLowerCase();
  expect(compactSql).not.toContain(' used, limit)');
  expect(compactSql).not.toContain('select scope, used, limit ');
  expect(compactSql).not.toContain(' limit = excluded.limit');
}
