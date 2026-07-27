import { sql } from 'drizzle-orm';
import {
  check,
  customType,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

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

export const communityIncidents = pgTable(
  'community_incidents',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => demoSessions.id, { onDelete: 'cascade' }),
    id: varchar('id', { length: 80 }).notNull(),
    description: text('description').notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    priority: varchar('priority', { length: 20 }).notNull(),
    suggestedResponsible: varchar('suggested_responsible', { length: 120 }).notNull(),
    suggestedNotice: text('suggested_notice').notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    insertedOrder: serial('inserted_order').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.id], name: 'community_incidents_pkey' }),
    check(
      'community_incidents_description_length',
      sql`char_length(${table.description}) between 10 and 1000`,
    ),
    check(
      'community_incidents_type_value',
      sql`${table.type} in ('agua', 'electricidad', 'ascensor', 'limpieza', 'seguridad', 'convivencia', 'otro')`,
    ),
    check(
      'community_incidents_priority_value',
      sql`${table.priority} in ('baja', 'media', 'alta', 'urgente')`,
    ),
    check(
      'community_incidents_suggested_notice_length',
      sql`char_length(${table.suggestedNotice}) <= 2000`,
    ),
    check('community_incidents_status_value', sql`${table.status} in ('pendiente', 'resuelta')`),
    check(
      'community_incidents_pending_without_resolution',
      sql`(${table.status} = 'pendiente' and ${table.resolvedAt} is null) or (${table.status} = 'resuelta' and ${table.resolvedAt} is not null)`,
    ),
  ],
);

export const pendingAgreements = pgTable(
  'pending_agreements',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => demoSessions.id, { onDelete: 'cascade' }),
    id: varchar('id', { length: 80 }).notNull(),
    description: varchar('description', { length: 240 }).notNull(),
    assignee: varchar('assignee', { length: 120 }),
    dueDate: varchar('due_date', { length: 80 }),
    normalizedSignature: text('normalized_signature').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    insertedOrder: serial('inserted_order').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.id], name: 'pending_agreements_pkey' }),
    check('pending_agreements_description_length', sql`char_length(${table.description}) >= 1`),
    check(
      'pending_agreements_assignee_length',
      sql`${table.assignee} is null or char_length(${table.assignee}) >= 1`,
    ),
    check(
      'pending_agreements_due_date_length',
      sql`${table.dueDate} is null or char_length(${table.dueDate}) >= 1`,
    ),
  ],
);

export const communityProposals = pgTable(
  'community_proposals',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => demoSessions.id, { onDelete: 'cascade' }),
    id: varchar('id', { length: 80 }).notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    insertedOrder: serial('inserted_order').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.id], name: 'community_proposals_pkey' }),
    check(
      'community_proposals_description_length',
      sql`char_length(${table.description}) between 10 and 1000`,
    ),
  ],
);

export const uploadedDocuments = pgTable(
  'uploaded_documents',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => demoSessions.id, { onDelete: 'cascade' }),
    id: varchar('id', { length: 80 }).notNull(),
    title: text('title').notNull(),
    filename: text('filename').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull(),
    documentUrl: text('document_url').notNull(),
    textContent: text('text_content').notNull(),
    content: bytea('content').notNull(),
    insertedOrder: serial('inserted_order').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.id], name: 'uploaded_documents_pkey' }),
    check('uploaded_documents_title_length', sql`char_length(${table.title}) >= 1`),
    check('uploaded_documents_filename_length', sql`char_length(${table.filename}) >= 1`),
    check('uploaded_documents_content_type_pdf', sql`${table.contentType} = 'application/pdf'`),
    check('uploaded_documents_size_bounds', sql`${table.sizeBytes} between 1 and 5242880`),
    check('uploaded_documents_document_url_length', sql`char_length(${table.documentUrl}) >= 1`),
    check('uploaded_documents_content_not_empty', sql`octet_length(${table.content}) >= 1`),
    check(
      'uploaded_documents_content_length_matches_size',
      sql`octet_length(${table.content}) = ${table.sizeBytes}`,
    ),
  ],
);
