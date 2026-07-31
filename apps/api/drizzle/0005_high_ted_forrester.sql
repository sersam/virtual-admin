CREATE TABLE "ai_telemetry_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"operation" varchar(80) NOT NULL,
	"provider" varchar(40) NOT NULL,
	"model" varchar(120) NOT NULL,
	"prompt_version" varchar(120) NOT NULL,
	"input_tokens" integer NOT NULL,
	"cached_input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"estimated_cost_usd" double precision NOT NULL,
	"latency_ms" integer NOT NULL,
	"result" varchar(20) NOT NULL,
	"fallback_reason" varchar(40),
	CONSTRAINT "ai_telemetry_events_operation_length" CHECK (char_length("ai_telemetry_events"."operation") >= 1),
	CONSTRAINT "ai_telemetry_events_provider_value" CHECK ("ai_telemetry_events"."provider" in ('openai', 'deterministic-demo')),
	CONSTRAINT "ai_telemetry_events_model_length" CHECK (char_length("ai_telemetry_events"."model") >= 1),
	CONSTRAINT "ai_telemetry_events_prompt_version_length" CHECK (char_length("ai_telemetry_events"."prompt_version") >= 1),
	CONSTRAINT "ai_telemetry_events_input_tokens_non_negative" CHECK ("ai_telemetry_events"."input_tokens" >= 0),
	CONSTRAINT "ai_telemetry_events_cached_input_tokens_non_negative" CHECK ("ai_telemetry_events"."cached_input_tokens" >= 0),
	CONSTRAINT "ai_telemetry_events_output_tokens_non_negative" CHECK ("ai_telemetry_events"."output_tokens" >= 0),
	CONSTRAINT "ai_telemetry_events_cost_non_negative" CHECK ("ai_telemetry_events"."estimated_cost_usd" >= 0),
	CONSTRAINT "ai_telemetry_events_latency_non_negative" CHECK ("ai_telemetry_events"."latency_ms" >= 0),
	CONSTRAINT "ai_telemetry_events_result_value" CHECK ("ai_telemetry_events"."result" in ('success', 'failure')),
	CONSTRAINT "ai_telemetry_events_fallback_reason_value" CHECK ("ai_telemetry_events"."fallback_reason" is null or "ai_telemetry_events"."fallback_reason" in ('session-quota', 'ip-quota', 'provider-error', 'quota-unavailable'))
);
--> statement-breakpoint
CREATE INDEX "ai_telemetry_events_occurred_at_idx" ON "ai_telemetry_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "ai_telemetry_events_operation_idx" ON "ai_telemetry_events" USING btree ("operation");--> statement-breakpoint
CREATE INDEX "ai_telemetry_events_model_idx" ON "ai_telemetry_events" USING btree ("provider","model");