CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" varchar(96) PRIMARY KEY NOT NULL,
	"session_id" uuid,
	"document_id" varchar(80) NOT NULL,
	"document_fingerprint" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"section" text NOT NULL,
	"document_url" text NOT NULL,
	"content" text NOT NULL,
	"embedding_model" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	CONSTRAINT "document_chunks_document_id_length" CHECK (char_length("document_chunks"."document_id") >= 1),
	CONSTRAINT "document_chunks_document_fingerprint_length" CHECK (char_length("document_chunks"."document_fingerprint") >= 1),
	CONSTRAINT "document_chunks_chunk_index_non_negative" CHECK ("document_chunks"."chunk_index" >= 0),
	CONSTRAINT "document_chunks_title_length" CHECK (char_length("document_chunks"."title") >= 1),
	CONSTRAINT "document_chunks_type_length" CHECK (char_length("document_chunks"."type") >= 1),
	CONSTRAINT "document_chunks_section_length" CHECK (char_length("document_chunks"."section") >= 1),
	CONSTRAINT "document_chunks_document_url_length" CHECK (char_length("document_chunks"."document_url") >= 1),
	CONSTRAINT "document_chunks_content_length" CHECK (char_length("document_chunks"."content") >= 1),
	CONSTRAINT "document_chunks_embedding_model_length" CHECK (char_length("document_chunks"."embedding_model") >= 1)
);
--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_session_id_demo_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."demo_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_chunks_scope_document_idx" ON "document_chunks" USING btree ("session_id","document_id","document_fingerprint");--> statement-breakpoint
CREATE INDEX "document_chunks_embedding_hnsw_idx" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);
