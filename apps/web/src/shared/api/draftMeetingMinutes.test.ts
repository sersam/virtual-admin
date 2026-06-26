import { afterEach, describe, expect, it, vi } from 'vitest';
import { draftMeetingMinutes } from './draftMeetingMinutes';

describe('draftMeetingMinutes api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function validDraftResponse(): Response {
    return new Response(
      JSON.stringify({
        draft: {
          title: 'Acta de reunión',
          body: 'Acta de reunión\n\nAcuerdos:\n- Aprobar presupuesto.',
          tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
        },
        mode: 'deterministic-demo',
      }),
      { status: 200 },
    );
  }

  it('envía notas al endpoint de actas y valida la respuesta', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(validDraftResponse());

    const response = await draftMeetingMinutes('Acuerdo: aprobar presupuesto.');

    expect(response.draft.title).toBe('Acta de reunión');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/meeting-minutes/draft',
      expect.objectContaining({
        body: JSON.stringify({
          notes: 'Acuerdo: aprobar presupuesto.',
        }),
        method: 'POST',
      }),
    );
  });

  it('rechaza notas inválidas sin llamar a la API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(draftMeetingMinutes('Acta')).rejects.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rechaza respuestas HTTP no exitosas', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }));

    await expect(draftMeetingMinutes('Acuerdo: aprobar presupuesto.')).rejects.toThrow(
      'No se pudo redactar el acta (HTTP 503).',
    );
  });

  it('rechaza respuestas con formato inválido', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          draft: { title: '', body: 'Contenido válido', tasks: [] },
          mode: 'deterministic-demo',
        }),
        { status: 200 },
      ),
    );

    await expect(draftMeetingMinutes('Acuerdo: aprobar presupuesto.')).rejects.toThrow();
  });

  it('reenvía AbortSignal a fetch', async () => {
    const controller = new AbortController();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(validDraftResponse());

    await draftMeetingMinutes('Acuerdo: aprobar presupuesto.', controller.signal);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/meeting-minutes/draft',
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
