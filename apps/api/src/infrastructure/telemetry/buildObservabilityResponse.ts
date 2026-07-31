import type { ObservabilityMetricSummary, ObservabilityResponse } from '@admin/contracts';
import { ObservabilityResponseSchema } from '@admin/contracts';
import type { AiTelemetrySummaryInput } from '../../application/ports/AiTelemetryEventRepository.js';
import type { PersistedAiTelemetryEvent } from '../../application/ports/AiTelemetryEventRepository.js';

export function buildObservabilityResponse(
  events: readonly PersistedAiTelemetryEvent[],
  input: AiTelemetrySummaryInput,
): ObservabilityResponse {
  const period = buildUtcPeriod(input.day);
  const response = {
    byModel: summarizeBy(events, (event) => `${event.provider}\u0000${event.model}`).map(
      ({ key, summary }) => {
        const [provider, model] = key.split('\u0000');
        return {
          ...summary,
          model: model ?? '',
          provider: provider === 'deterministic-demo' ? provider : 'openai',
        };
      },
    ),
    byOperation: summarizeBy(events, (event) => event.operation).map(({ key, summary }) => ({
      ...summary,
      operation: key,
    })),
    generatedAt: input.generatedAt.toISOString(),
    limits: {
      aiActionsPerIpPerDay: input.ipLimit,
      aiActionsPerSessionPerDay: input.sessionLimit,
    },
    period: {
      day: input.day,
      endsAt: period.endsAt.toISOString(),
      startsAt: period.startsAt.toISOString(),
      timezone: 'UTC' as const,
    },
    summary: summarize(events),
  };

  return ObservabilityResponseSchema.parse(response);
}

export function buildUtcPeriod(day: string): { readonly endsAt: Date; readonly startsAt: Date } {
  const startsAt = new Date(`${day}T00:00:00.000Z`);
  return {
    endsAt: new Date(startsAt.getTime() + 24 * 60 * 60 * 1000),
    startsAt,
  };
}

function summarizeBy(
  events: readonly PersistedAiTelemetryEvent[],
  keyOf: (event: PersistedAiTelemetryEvent) => string,
): Array<{ readonly key: string; readonly summary: ObservabilityMetricSummary }> {
  const groups = new Map<string, PersistedAiTelemetryEvent[]>();
  for (const event of events) {
    const key = keyOf(event);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return [...groups.entries()]
    .map(([key, group]) => ({ key, summary: summarize(group) }))
    .sort((left, right) => {
      const executionDiff = right.summary.executions - left.summary.executions;
      if (executionDiff !== 0) return executionDiff;
      return left.key.localeCompare(right.key);
    });
}

function summarize(events: readonly PersistedAiTelemetryEvent[]): ObservabilityMetricSummary {
  const totals = events.reduce(
    (current, event) => ({
      cachedInputTokens: current.cachedInputTokens + event.cachedInputTokens,
      estimatedCostUsd: current.estimatedCostUsd + event.estimatedCostUsd,
      failures: current.failures + (event.result === 'failure' ? 1 : 0),
      fallbacks: current.fallbacks + (event.fallbackReason ? 1 : 0),
      inputTokens: current.inputTokens + event.inputTokens,
      latencyMs: current.latencyMs + event.latencyMs,
      outputTokens: current.outputTokens + event.outputTokens,
      successes: current.successes + (event.result === 'success' ? 1 : 0),
    }),
    {
      cachedInputTokens: 0,
      estimatedCostUsd: 0,
      failures: 0,
      fallbacks: 0,
      inputTokens: 0,
      latencyMs: 0,
      outputTokens: 0,
      successes: 0,
    },
  );
  const executions = events.length;

  return {
    averageLatencyMs: executions > 0 ? Math.round(totals.latencyMs / executions) : 0,
    cachedInputTokens: totals.cachedInputTokens,
    estimatedCostUsd: Number(totals.estimatedCostUsd.toFixed(8)),
    executions,
    failures: totals.failures,
    fallbacks: totals.fallbacks,
    inputTokens: totals.inputTokens,
    outputTokens: totals.outputTokens,
    successes: totals.successes,
    totalTokens: totals.inputTokens + totals.cachedInputTokens + totals.outputTokens,
  };
}
