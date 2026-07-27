CREATE TABLE "community_incidents" (
	"session_id" uuid NOT NULL,
	"id" varchar(80) NOT NULL,
	"description" text NOT NULL,
	"type" varchar(20) NOT NULL,
	"priority" varchar(20) NOT NULL,
	"suggested_responsible" varchar(120) NOT NULL,
	"suggested_notice" text NOT NULL,
	"status" varchar(20) NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"inserted_order" serial NOT NULL,
	CONSTRAINT "community_incidents_pkey" PRIMARY KEY("session_id","id"),
	CONSTRAINT "community_incidents_description_length" CHECK (char_length("community_incidents"."description") between 10 and 1000),
	CONSTRAINT "community_incidents_type_value" CHECK ("community_incidents"."type" in ('agua', 'electricidad', 'ascensor', 'limpieza', 'seguridad', 'convivencia', 'otro')),
	CONSTRAINT "community_incidents_priority_value" CHECK ("community_incidents"."priority" in ('baja', 'media', 'alta', 'urgente')),
	CONSTRAINT "community_incidents_suggested_notice_length" CHECK (char_length("community_incidents"."suggested_notice") <= 2000),
	CONSTRAINT "community_incidents_status_value" CHECK ("community_incidents"."status" in ('pendiente', 'resuelta')),
	CONSTRAINT "community_incidents_pending_without_resolution" CHECK (("community_incidents"."status" = 'pendiente' and "community_incidents"."resolved_at" is null) or ("community_incidents"."status" = 'resuelta' and "community_incidents"."resolved_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "community_proposals" (
	"session_id" uuid NOT NULL,
	"id" varchar(80) NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"inserted_order" serial NOT NULL,
	CONSTRAINT "community_proposals_pkey" PRIMARY KEY("session_id","id"),
	CONSTRAINT "community_proposals_description_length" CHECK (char_length("community_proposals"."description") between 10 and 1000)
);
--> statement-breakpoint
CREATE TABLE "pending_agreements" (
	"session_id" uuid NOT NULL,
	"id" varchar(80) NOT NULL,
	"description" varchar(240) NOT NULL,
	"assignee" varchar(120),
	"due_date" varchar(80),
	"normalized_signature" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"inserted_order" serial NOT NULL,
	CONSTRAINT "pending_agreements_pkey" PRIMARY KEY("session_id","id"),
	CONSTRAINT "pending_agreements_description_length" CHECK (char_length("pending_agreements"."description") >= 1),
	CONSTRAINT "pending_agreements_assignee_length" CHECK ("pending_agreements"."assignee" is null or char_length("pending_agreements"."assignee") >= 1),
	CONSTRAINT "pending_agreements_due_date_length" CHECK ("pending_agreements"."due_date" is null or char_length("pending_agreements"."due_date") >= 1)
);
--> statement-breakpoint
ALTER TABLE "community_incidents" ADD CONSTRAINT "community_incidents_session_id_demo_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."demo_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_proposals" ADD CONSTRAINT "community_proposals_session_id_demo_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."demo_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_agreements" ADD CONSTRAINT "pending_agreements_session_id_demo_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."demo_sessions"("id") ON DELETE cascade ON UPDATE no action;