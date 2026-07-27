import { getTableColumns, getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { demoSessions } from './schema.js';

describe('database schema', () => {
  it('define la tabla de sesiones demo persistentes', () => {
    const columns = getTableColumns(demoSessions);

    expect(getTableName(demoSessions)).toBe('demo_sessions');
    expect(Object.keys(columns)).toEqual([
      'id',
      'createdAt',
      'lastSeenAt',
      'expiresAt',
      'requestsUsed',
      'requestsLimit',
    ]);
    expect(columns.id.name).toBe('id');
    expect(columns.createdAt.name).toBe('created_at');
    expect(columns.lastSeenAt.name).toBe('last_seen_at');
    expect(columns.expiresAt.name).toBe('expires_at');
    expect(columns.requestsUsed.name).toBe('requests_used');
    expect(columns.requestsLimit.name).toBe('requests_limit');
  });
});
