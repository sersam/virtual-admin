import { getTableColumns, getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import {
  communityIncidents,
  communityProposals,
  demoSessions,
  pendingAgreements,
} from './schema.js';

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

  it('define las tablas de estado comunitario', () => {
    expect(getTableName(communityIncidents)).toBe('community_incidents');
    expect(Object.keys(getTableColumns(communityIncidents))).toEqual([
      'sessionId',
      'id',
      'description',
      'type',
      'priority',
      'suggestedResponsible',
      'suggestedNotice',
      'status',
      'resolvedAt',
      'createdAt',
      'insertedOrder',
    ]);

    expect(getTableName(pendingAgreements)).toBe('pending_agreements');
    expect(Object.keys(getTableColumns(pendingAgreements))).toEqual([
      'sessionId',
      'id',
      'description',
      'assignee',
      'dueDate',
      'normalizedSignature',
      'createdAt',
      'insertedOrder',
    ]);

    expect(getTableName(communityProposals)).toBe('community_proposals');
    expect(Object.keys(getTableColumns(communityProposals))).toEqual([
      'sessionId',
      'id',
      'description',
      'createdAt',
      'insertedOrder',
    ]);
  });
});
