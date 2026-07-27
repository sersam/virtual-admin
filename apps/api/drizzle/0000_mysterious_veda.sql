CREATE TABLE "demo_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"requests_used" integer NOT NULL,
	"requests_limit" integer NOT NULL,
	CONSTRAINT "demo_sessions_requests_used_non_negative" CHECK ("demo_sessions"."requests_used" >= 0),
	CONSTRAINT "demo_sessions_requests_limit_positive" CHECK ("demo_sessions"."requests_limit" > 0),
	CONSTRAINT "demo_sessions_requests_used_not_above_limit" CHECK ("demo_sessions"."requests_used" <= "demo_sessions"."requests_limit"),
	CONSTRAINT "demo_sessions_expires_after_created" CHECK ("demo_sessions"."expires_at" > "demo_sessions"."created_at")
);
