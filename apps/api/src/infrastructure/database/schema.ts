import { sql } from 'drizzle-orm';
import {
  check,
  customType,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
  vector,
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

export const documentChunks = pgTable(
  'document_chunks',
  {
    id: varchar('id', { length: 96 }).primaryKey(),
    sessionId: uuid('session_id').references(() => demoSessions.id, { onDelete: 'cascade' }),
    documentId: varchar('document_id', { length: 80 }).notNull(),
    documentFingerprint: text('document_fingerprint').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    title: text('title').notNull(),
    type: text('type').notNull(),
    section: text('section').notNull(),
    documentUrl: text('document_url').notNull(),
    content: text('content').notNull(),
    embeddingModel: text('embedding_model').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  },
  (table) => [
    check('document_chunks_document_id_length', sql`char_length(${table.documentId}) >= 1`),
    check(
      'document_chunks_document_fingerprint_length',
      sql`char_length(${table.documentFingerprint}) >= 1`,
    ),
    check('document_chunks_chunk_index_non_negative', sql`${table.chunkIndex} >= 0`),
    check('document_chunks_title_length', sql`char_length(${table.title}) >= 1`),
    check('document_chunks_type_length', sql`char_length(${table.type}) >= 1`),
    check('document_chunks_section_length', sql`char_length(${table.section}) >= 1`),
    check('document_chunks_document_url_length', sql`char_length(${table.documentUrl}) >= 1`),
    check('document_chunks_content_length', sql`char_length(${table.content}) >= 1`),
    check('document_chunks_embedding_model_length', sql`char_length(${table.embeddingModel}) >= 1`),
    index('document_chunks_scope_document_idx').on(
      table.sessionId,
      table.documentId,
      table.documentFingerprint,
    ),
    index('document_chunks_embedding_hnsw_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  ],
);

export const aiActionQuotaCounters = pgTable(
  'ai_action_quota_counters',
  {
    scope: varchar('scope', { length: 16 }).notNull(),
    day: varchar('day', { length: 10 }).notNull(),
    identityHash: varchar('identity_hash', { length: 64 }).notNull(),
    used: integer('used').notNull(),
    limit: integer('limit').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.scope, table.day, table.identityHash],
      name: 'ai_action_quota_counters_pkey',
    }),
    check('ai_action_quota_counters_scope_value', sql`${table.scope} in ('session', 'ip')`),
    check('ai_action_quota_counters_day_length', sql`char_length(${table.day}) = 10`),
    check(
      'ai_action_quota_counters_identity_hash_length',
      sql`char_length(${table.identityHash}) = 64`,
    ),
    check('ai_action_quota_counters_used_non_negative', sql`${table.used} >= 0`),
    check('ai_action_quota_counters_limit_positive', sql`${table.limit} > 0`),
    check('ai_action_quota_counters_used_not_above_limit', sql`${table.used} <= ${table.limit}`),
    index('ai_action_quota_counters_day_scope_idx').on(table.day, table.scope),
  ],
);

export const aiTelemetryEvents = pgTable(
  'ai_telemetry_events',
  {
    id: serial('id').primaryKey(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    operation: varchar('operation', { length: 80 }).notNull(),
    provider: varchar('provider', { length: 40 }).notNull(),
    model: varchar('model', { length: 120 }).notNull(),
    promptVersion: varchar('prompt_version', { length: 120 }).notNull(),
    inputTokens: integer('input_tokens').notNull(),
    cachedInputTokens: integer('cached_input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    estimatedCostUsd: doublePrecision('estimated_cost_usd').notNull(),
    latencyMs: integer('latency_ms').notNull(),
    result: varchar('result', { length: 20 }).notNull(),
    fallbackReason: varchar('fallback_reason', { length: 40 }),
  },
  (table) => [
    check('ai_telemetry_events_operation_length', sql`char_length(${table.operation}) >= 1`),
    check(
      'ai_telemetry_events_provider_value',
      sql`${table.provider} in ('openai', 'deterministic-demo')`,
    ),
    check('ai_telemetry_events_model_length', sql`char_length(${table.model}) >= 1`),
    check(
      'ai_telemetry_events_prompt_version_length',
      sql`char_length(${table.promptVersion}) >= 1`,
    ),
    check('ai_telemetry_events_input_tokens_non_negative', sql`${table.inputTokens} >= 0`),
    check(
      'ai_telemetry_events_cached_input_tokens_non_negative',
      sql`${table.cachedInputTokens} >= 0`,
    ),
    check('ai_telemetry_events_output_tokens_non_negative', sql`${table.outputTokens} >= 0`),
    check('ai_telemetry_events_cost_non_negative', sql`${table.estimatedCostUsd} >= 0`),
    check('ai_telemetry_events_latency_non_negative', sql`${table.latencyMs} >= 0`),
    check('ai_telemetry_events_result_value', sql`${table.result} in ('success', 'failure')`),
    check(
      'ai_telemetry_events_fallback_reason_value',
      sql`${table.fallbackReason} is null or ${table.fallbackReason} in ('session-quota', 'ip-quota', 'provider-error', 'quota-unavailable')`,
    ),
    index('ai_telemetry_events_occurred_at_idx').on(table.occurredAt),
    index('ai_telemetry_events_operation_idx').on(table.operation),
    index('ai_telemetry_events_model_idx').on(table.provider, table.model),
  ],
);
