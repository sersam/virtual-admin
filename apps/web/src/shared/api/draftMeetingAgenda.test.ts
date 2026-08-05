import { afterEach, describe, expect, it, vi } from 'vitest';
import { draftMeetingAgenda } from './draftMeetingAgenda';

describe('draftMeetingAgenda api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('solicita un orden del día y valida la respuesta', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(validAgendaResponse());

    const response = await draftMeetingAgenda('meeting-ordinary-2026-09-18');

    expect(response.draft.title).toBe('Orden del día · Junta ordinaria · 18 de septiembre de 2026');
    expect(response.mode).toBe('openai');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/meeting-agendas/draft',
      expect.objectContaining({
        body: JSON.stringify({ meetingId: 'meeting-ordinary-2026-09-18' }),
        credentials: 'include',
        method: 'POST',
      }),
    );
  });

  it('rechaza respuestas HTTP no exitosas', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }));

    await expect(draftMeetingAgenda('meeting-ordinary-2026-09-18')).rejects.toThrow(
      'No se pudo preparar el orden del día (HTTP 503).',
    );
  });

  it('rechaza respuestas exitosas que no cumplen el contrato', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ draft: { title: 'Orden del día' } }), { status: 200 }),
    );

    await expect(draftMeetingAgenda('meeting-ordinary-2026-09-18')).rejects.toThrow();
  });

  it('reenvía AbortSignal a fetch', async () => {
    const controller = new AbortController();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(validAgendaResponse());

    await draftMeetingAgenda('meeting-ordinary-2026-09-18', controller.signal);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/meeting-agendas/draft',
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});

function validAgendaResponse(): Response {
  return new Response(
    JSON.stringify({
      draft: {
        title: 'Orden del día · Junta ordinaria · 18 de septiembre de 2026',
        body: 'Orden del día\n\n1. [Urgente] Fuga de agua urgente.',
        items: [
          {
            description: 'Fuga de agua urgente',
            priority: 'urgente',
            sourceType: 'incident',
            sourceId: 'inc-1',
            status: 'pendiente',
            resolvedAt: null,
          },
        ],
      },
      filterExplanations: [
        'Junta ordinaria: se revisan los últimos 90 días hasta el momento de preparación.',
      ],
      meeting: {
        id: 'meeting-ordinary-2026-09-18',
        kind: 'ordinaria',
        title: 'Junta ordinaria',
        scheduledAt: '2026-09-18T17:00:00.000Z',
        reviewPeriod: {
          startsAt: '2026-04-30T08:30:00.000Z',
          endsAt: '2026-07-29T08:30:00.000Z',
        },
      },
      mode: 'openai',
      reviewPeriod: {
        startsAt: '2026-04-30T08:30:00.000Z',
        endsAt: '2026-07-29T08:30:00.000Z',
      },
    }),
    { status: 200 },
  );
}
