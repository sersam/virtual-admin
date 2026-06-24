import { afterEach, describe, expect, it, vi } from 'vitest';
import { draftCommunityNotice } from './draftCommunityNotice';

describe('draftCommunityNotice api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envía mensajes al endpoint de comunicados y valida la respuesta', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          draft: {
            subject: 'Corte de agua',
            body: 'Estimados vecinos:\n\nLes informamos sobre el corte de agua.',
          },
          mode: 'deterministic-demo',
        }),
        { status: 200 },
      ),
    );

    const response = await draftCommunityNotice('Redacta un comunicado sobre el corte de agua.');

    expect(response.draft.subject).toBe('Corte de agua');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/communications/draft',
      expect.objectContaining({
        body: JSON.stringify({
          message: 'Redacta un comunicado sobre el corte de agua.',
        }),
        method: 'POST',
      }),
    );
  });

  it('rechaza mensajes inválidos sin llamar a la API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(draftCommunityNotice('ok')).rejects.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
