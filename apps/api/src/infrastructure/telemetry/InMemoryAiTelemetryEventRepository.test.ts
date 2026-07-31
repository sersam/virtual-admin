import { describe, expect, it } from 'vitest';
import { InMemoryAiTelemetryEventRepository } from './InMemoryAiTelemetryEventRepository.js';

describe('InMemoryAiTelemetryEventRepository', () => {
  it('persiste solo eventos tecnicos y separa por dia UTC', async () => {
    const repository = new InMemoryAiTelemetryEventRepository();
    await repository.record({
      cachedInputTokens: 0,
      estimatedCostUsd: 0.002,
      inputTokens: 20,
      latencyMs: 90,
      model: 'gpt-5-mini',
      occurredAt: new Date('2026-07-31T23:59:59.000Z'),
      operation: 'meeting-minutes',
      outputTokens: 10,
      promptVersion: 'meeting-minutes.v1',
      provider: 'openai',
      result: 'success',
    });
    await repository.record({
      cachedInputTokens: 0,
      estimatedCostUsd: 0,
      inputTokens: 0,
      latencyMs: 10,
      model: 'deterministic-demo',
      occurredAt: new Date('2026-08-01T00:00:00.000Z'),
      operation: 'meeting-minutes',
      outputTokens: 0,
      promptVersion: 'fallback.v1',
      provider: 'deterministic-demo',
      result: 'success',
    });

    const response = await repository.summarizeDay({
      day: '2026-07-31',
      generatedAt: new Date('2026-08-01T10:00:00.000Z'),
      ipLimit: 100,
      sessionLimit: 20,
    });

    expect(response.summary.executions).toBe(1);
    expect(JSON.stringify(repository.listForTest())).not.toContain('contenido de usuario');
  });
});
