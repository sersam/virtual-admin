import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchObservability } from './fetchObservability';

describe('fetchObservability', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('valida el contrato de observabilidad de la API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(response), { status: 200 })),
    );

    await expect(fetchObservability()).resolves.toMatchObject({
      period: { day: '2026-07-31' },
      summary: { executions: 1 },
    });
  });

  it('rechaza respuestas no disponibles', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 503 })),
    );

    await expect(fetchObservability()).rejects.toThrow('No se pudieron cargar las métricas');
  });
});

const summary = {
  averageLatencyMs: 90,
  cachedInputTokens: 0,
  estimatedCostUsd: 0.001,
  executions: 1,
  failures: 0,
  fallbacks: 0,
  inputTokens: 20,
  outputTokens: 10,
  successes: 1,
  totalTokens: 30,
} as const;

const response = {
  byModel: [{ ...summary, model: 'gpt-5-mini', provider: 'openai' }],
  byOperation: [{ ...summary, operation: 'document-answer' }],
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
};
