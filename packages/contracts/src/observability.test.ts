import { describe, expect, it } from 'vitest';
import { ObservabilityResponseSchema } from './observability.js';

describe('observability contracts', () => {
  it('valida metricas tecnicas agregadas del dia UTC', () => {
    const response = ObservabilityResponseSchema.parse({
      byModel: [
        {
          ...summary,
          model: 'gpt-5-mini',
          provider: 'openai',
        },
      ],
      byOperation: [
        {
          ...summary,
          operation: 'document-answer',
        },
      ],
      generatedAt: '2026-07-31T11:00:00.000Z',
      limits: {
        aiActionsPerIpPerDay: 100,
        aiActionsPerSessionPerDay: 20,
      },
      period: {
        day: '2026-07-31',
        endsAt: '2026-08-01T00:00:00.000Z',
        startsAt: '2026-07-31T00:00:00.000Z',
        timezone: 'UTC',
      },
      summary,
    });

    expect(response.summary.executions).toBe(2);
    expect(response.byOperation[0]?.operation).toBe('document-answer');
  });

  it('rechaza metricas sin limites positivos o fuera del periodo diario', () => {
    expect(() =>
      ObservabilityResponseSchema.parse({
        byModel: [],
        byOperation: [],
        generatedAt: '2026-07-31T11:00:00.000Z',
        limits: {
          aiActionsPerIpPerDay: 0,
          aiActionsPerSessionPerDay: 20,
        },
        period: {
          day: '31-07-2026',
          endsAt: '2026-08-01T00:00:00.000Z',
          startsAt: '2026-07-31T00:00:00.000Z',
          timezone: 'UTC',
        },
        summary,
      }),
    ).toThrow();
  });
});

const summary = {
  averageLatencyMs: 120,
  cachedInputTokens: 3,
  estimatedCostUsd: 0.0012,
  executions: 2,
  failures: 0,
  fallbacks: 1,
  inputTokens: 100,
  outputTokens: 50,
  successes: 2,
  totalTokens: 153,
} as const;
