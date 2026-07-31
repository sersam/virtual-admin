import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObservabilityPanel } from './ObservabilityPanel';

describe('ObservabilityPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra métricas reales agregadas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(response), { status: 200 })),
    );

    render(<ObservabilityPanel />);

    expect(await screen.findByText('Límites y métricas técnicas IA')).toBeInTheDocument();
    expect(await screen.findByText('1 ejecuciones')).toBeInTheDocument();
    expect(screen.getByText(/20 acciones por sesión/i)).toBeInTheDocument();
    expect(screen.getByText('Documentos')).toBeInTheDocument();
  });

  it('muestra indisponibilidad sin inventar métricas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 503 })),
    );

    render(<ObservabilityPanel />);

    expect(await screen.findByText(/No hay métricas reales disponibles/i)).toBeInTheDocument();
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
