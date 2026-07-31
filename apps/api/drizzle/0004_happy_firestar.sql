CREATE TABLE "ai_action_quota_counters" (
	"scope" varchar(16) NOT NULL,
	"day" varchar(10) NOT NULL,
	"identity_hash" varchar(64) NOT NULL,
	"used" integer NOT NULL,
	"limit" integer NOT NULL,
	CONSTRAINT "ai_action_quota_counters_pkey" PRIMARY KEY("scope","day","identity_hash"),
	CONSTRAINT "ai_action_quota_counters_scope_value" CHECK ("ai_action_quota_counters"."scope" in ('session', 'ip')),
	CONSTRAINT "ai_action_quota_counters_day_length" CHECK (char_length("ai_action_quota_counters"."day") = 10),
	CONSTRAINT "ai_action_quota_counters_identity_hash_length" CHECK (char_length("ai_action_quota_counters"."identity_hash") = 64),
	CONSTRAINT "ai_action_quota_counters_used_non_negative" CHECK ("ai_action_quota_counters"."used" >= 0),
	CONSTRAINT "ai_action_quota_counters_limit_positive" CHECK ("ai_action_quota_counters"."limit" > 0),
	CONSTRAINT "ai_action_quota_counters_used_not_above_limit" CHECK ("ai_action_quota_counters"."used" <= "ai_action_quota_counters"."limit")
);
--> statement-breakpoint
CREATE INDEX "ai_action_quota_counters_day_scope_idx" ON "ai_action_quota_counters" USING btree ("day","scope");