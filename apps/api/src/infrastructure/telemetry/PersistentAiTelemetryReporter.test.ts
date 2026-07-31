import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Clock } from '../../application/ports/Clock.js';
import type { AiTelemetryEventRepository } from '../../application/ports/AiTelemetryEventRepository.js';
import { InMemoryAiTelemetryEventRepository } from './InMemoryAiTelemetryEventRepository.js';
import { PersistentAiTelemetryReporter } from './PersistentAiTelemetryReporter.js';

describe('PersistentAiTelemetryReporter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(reporter.record(event)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledTimes(2);
  });

  it('persiste eventos de fallback determinista con motivo publico', async () => {
    const repository = new InMemoryAiTelemetryEventRepository();
    const reporter = new PersistentAiTelemetryReporter({
      clock,
      consoleReporter: { record: async () => undefined },
      repository,
    });
    const fallbackEvent = {
      cachedInputTokens: 0,
      estimatedCostUsd: 0,
      fallbackReason: 'quota-unavailable',
      inputTokens: 0,
      latencyMs: 38,
      model: 'deterministic-demo',
      operation: 'chat-intent-classification',
      outputTokens: 0,
      promptVersion: 'deterministic-fallback.v1',
      provider: 'deterministic-demo',
      result: 'failure',
    } as const;

    await reporter.record(fallbackEvent);

    expect(repository.listForTest()).toEqual([
      {
        ...fallbackEvent,
        occurredAt: clock.now(),
      },
    ]);
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
