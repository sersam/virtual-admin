import { describe, expect, it } from 'vitest';
import { buildObservabilityResponse, buildUtcPeriod } from './buildObservabilityResponse.js';

describe('buildObservabilityResponse', () => {
  it('agrega eventos por dia, operacion y modelo', () => {
    const response = buildObservabilityResponse(
      [
        {
          cachedInputTokens: 1,
          estimatedCostUsd: 0.001,
          inputTokens: 10,
          latencyMs: 100,
          model: 'gpt-5-mini',
          occurredAt: new Date('2026-07-31T10:00:00.000Z'),
          operation: 'document-answer',
          outputTokens: 5,
          promptVersion: 'document-answer.v1',
          provider: 'openai',
          result: 'success',
        },
        {
          cachedInputTokens: 0,
          estimatedCostUsd: 0,
          fallbackReason: 'provider-error',
          inputTokens: 0,
          latencyMs: 50,
          model: 'deterministic-demo',
          occurredAt: new Date('2026-07-31T10:01:00.000Z'),
          operation: 'document-answer',
          outputTokens: 0,
          promptVersion: 'fallback.v1',
          provider: 'deterministic-demo',
          result: 'success',
        },
      ],
      input,
    );

    expect(response.summary).toMatchObject({
      averageLatencyMs: 75,
      estimatedCostUsd: 0.001,
      executions: 2,
      fallbacks: 1,
      totalTokens: 16,
    });
    expect(response.byOperation).toHaveLength(1);
    expect(response.byModel.map(({ model }) => model)).toEqual([
      'deterministic-demo',
      'gpt-5-mini',
    ]);
  });

  it('devuelve agregados vacios sin inventar valores', () => {
    expect(buildObservabilityResponse([], input).summary).toEqual({
      averageLatencyMs: 0,
      cachedInputTokens: 0,
      estimatedCostUsd: 0,
      executions: 0,
      failures: 0,
      fallbacks: 0,
      inputTokens: 0,
      outputTokens: 0,
      successes: 0,
      totalTokens: 0,
    });
  });

  it('calcula inicio y fin del dia UTC', () => {
    expect(buildUtcPeriod('2026-07-31')).toEqual({
      endsAt: new Date('2026-08-01T00:00:00.000Z'),
      startsAt: new Date('2026-07-31T00:00:00.000Z'),
    });
  });
});

const input = {
  day: '2026-07-31',
  generatedAt: new Date('2026-07-31T11:00:00.000Z'),
  ipLimit: 100,
  sessionLimit: 20,
} as const;
