import {
  AiFallbackReasonSchema,
  AiTelemetryProviderSchema,
  type AiFallbackReason,
} from '@admin/contracts';
import type pg from 'pg';
import type {
  AiTelemetryEventRepository,
  AiTelemetrySummaryInput,
  PersistedAiTelemetryEvent,
} from '../../application/ports/AiTelemetryEventRepository.js';
import type {
  AiOperation,
  AiTelemetryResult,
} from '../../application/ports/AiTelemetryReporter.js';
import { buildUtcPeriod, buildObservabilityResponse } from './buildObservabilityResponse.js';

interface AiTelemetryEventRow {
  readonly cached_input_tokens: number;
  readonly estimated_cost_usd: number;
  readonly fallback_reason: AiFallbackReason | null;
  readonly input_tokens: number;
  readonly latency_ms: number;
  readonly model: string;
  readonly occurred_at: Date;
  readonly operation: AiOperation;
  readonly output_tokens: number;
  readonly prompt_version: string;
  readonly provider: 'deterministic-demo' | 'openai';
  readonly result: AiTelemetryResult;
}

export class PostgresAiTelemetryEventRepository implements AiTelemetryEventRepository {
  constructor(private readonly pool: pg.Pool) {}

  async record(event: PersistedAiTelemetryEvent): Promise<void> {
    await this.pool.query(
      `
        insert into ai_telemetry_events (
          occurred_at, operation, provider, model, prompt_version, input_tokens,
          cached_input_tokens, output_tokens, estimated_cost_usd, latency_ms, result,
          fallback_reason
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        event.occurredAt,
        event.operation,
        event.provider,
        event.model,
        event.promptVersion,
        event.inputTokens,
        event.cachedInputTokens,
        event.outputTokens,
        event.estimatedCostUsd,
        event.latencyMs,
        event.result,
        event.fallbackReason ?? null,
      ],
    );
  }

  async summarizeDay(input: AiTelemetrySummaryInput) {
    const period = buildUtcPeriod(input.day);
    const result = await this.pool.query<AiTelemetryEventRow>(
      `
        select
          occurred_at,
          operation,
          provider,
          model,
          prompt_version,
          input_tokens,
          cached_input_tokens,
          output_tokens,
          estimated_cost_usd,
          latency_ms,
          result,
          fallback_reason
        from ai_telemetry_events
        where occurred_at >= $1 and occurred_at < $2
        order by occurred_at, id
      `,
      [period.startsAt, period.endsAt],
    );

    return buildObservabilityResponse(result.rows.map(mapRow), input);
  }
}

function mapRow(row: AiTelemetryEventRow): PersistedAiTelemetryEvent {
  const provider = AiTelemetryProviderSchema.parse(row.provider);
  const fallbackReason = row.fallback_reason
    ? AiFallbackReasonSchema.parse(row.fallback_reason)
    : undefined;

  return {
    cachedInputTokens: row.cached_input_tokens,
    estimatedCostUsd: row.estimated_cost_usd,
    ...(fallbackReason ? { fallbackReason } : {}),
    inputTokens: row.input_tokens,
    latencyMs: row.latency_ms,
    model: row.model,
    occurredAt: row.occurred_at,
    operation: row.operation,
    outputTokens: row.output_tokens,
    promptVersion: row.prompt_version,
    provider,
    result: row.result,
  };
}
