import { describe, expect, it } from 'vitest';
import type { Clock } from '../../application/ports/Clock.js';
import type { AiTelemetryEventRepository } from '../../application/ports/AiTelemetryEventRepository.js';
import { InMemoryAiTelemetryEventRepository } from './InMemoryAiTelemetryEventRepository.js';
import { PersistentAiTelemetryReporter } from './PersistentAiTelemetryReporter.js';

describe('PersistentAiTelemetryReporter', () => {
  it('persiste eventos OpenAI con fecha y proveedor por defecto', async () => {
    const repository = new InMemoryAiTelemetryEventRepository();
    const reporter = new PersistentAiTelemetryReporter({
      clock,
      consoleReporter: { record: async () => undefined },
      repository,
    });

    await reporter.record(event);

    expect(repository.listForTest()).toEqual([
      {
        ...event,
        occurredAt: clock.now(),
        provider: 'openai',
      },
    ]);
  });

  it('no propaga errores de persistencia ni de log', async () => {
    const repository: AiTelemetryEventRepository = {
      record: async () => {
        throw new Error('database unavailable');
      },
      summarizeDay: async () => {
        throw new Error('not used');
      },
    };
    const reporter = new PersistentAiTelemetryReporter({
      clock,
      consoleReporter: {
        record: async () => {
          throw new Error('console unavailable');
        },
      },
      repository,
    });

    await expect(reporter.record(event)).resolves.toBeUndefined();
  });
});

const clock: Clock = {
  now: () => new Date('2026-07-31T10:00:00.000Z'),
};

const event = {
  cachedInputTokens: 2,
  estimatedCostUsd: 0.001,
  inputTokens: 30,
  latencyMs: 120,
  model: 'gpt-5-mini',
  operation: 'community-notice',
  outputTokens: 20,
  promptVersion: 'community-notice.v1',
  result: 'success',
} as const;
