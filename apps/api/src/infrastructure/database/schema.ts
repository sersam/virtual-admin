import { sql } from 'drizzle-orm';
import { check, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const demoSessions = pgTable(
  'demo_sessions',
  {
    id: uuid('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    requestsUsed: integer('requests_used').notNull(),
    requestsLimit: integer('requests_limit').notNull(),
  },
  (table) => [
    check('demo_sessions_requests_used_non_negative', sql`${table.requestsUsed} >= 0`),
    check('demo_sessions_requests_limit_positive', sql`${table.requestsLimit} > 0`),
    check(
      'demo_sessions_requests_used_not_above_limit',
      sql`${table.requestsUsed} <= ${table.requestsLimit}`,
    ),
    check('demo_sessions_expires_after_created', sql`${table.expiresAt} > ${table.createdAt}`),
  ],
);
