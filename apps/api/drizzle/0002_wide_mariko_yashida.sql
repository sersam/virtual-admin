CREATE TABLE "uploaded_documents" (
	"session_id" uuid NOT NULL,
	"id" varchar(80) NOT NULL,
	"title" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_at" timestamp with time zone NOT NULL,
	"document_url" text NOT NULL,
	"text_content" text NOT NULL,
	"content" "bytea" NOT NULL,
	"inserted_order" serial NOT NULL,
	CONSTRAINT "uploaded_documents_pkey" PRIMARY KEY("session_id","id"),
	CONSTRAINT "uploaded_documents_title_length" CHECK (char_length("uploaded_documents"."title") >= 1),
	CONSTRAINT "uploaded_documents_filename_length" CHECK (char_length("uploaded_documents"."filename") >= 1),
	CONSTRAINT "uploaded_documents_content_type_pdf" CHECK ("uploaded_documents"."content_type" = 'application/pdf'),
	CONSTRAINT "uploaded_documents_size_bounds" CHECK ("uploaded_documents"."size_bytes" between 1 and 5242880),
	CONSTRAINT "uploaded_documents_document_url_length" CHECK (char_length("uploaded_documents"."document_url") >= 1),
	CONSTRAINT "uploaded_documents_content_not_empty" CHECK (octet_length("uploaded_documents"."content") >= 1),
	CONSTRAINT "uploaded_documents_content_length_matches_size" CHECK (octet_length("uploaded_documents"."content") = "uploaded_documents"."size_bytes")
);
--> statement-breakpoint
ALTER TABLE "uploaded_documents" ADD CONSTRAINT "uploaded_documents_session_id_demo_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."demo_sessions"("id") ON DELETE cascade ON UPDATE no action;
