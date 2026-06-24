import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendChatMessage } from './sendChatMessage';

describe('sendChatMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envía mensajes al coordinador y valida la respuesta', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          agent: 'documentos',
          answer: 'La piscina abre de 10:00 a 21:00.',
          mode: 'langgraph-demo',
          sources: [
            {
              id: 'normas-piscina',
              title: 'Normas de uso de zonas comunes',
              type: 'normas',
              section: 'Piscina',
              excerpt: 'La piscina comunitaria abre de 10:00 a 21:00.',
              documentUrl: '/documents/normas-zonas-comunes.pdf',
              score: 0.9,
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const response = await sendChatMessage('¿Qué dicen las normas de la piscina?');

    expect(response.agent).toBe('documentos');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/api/chat/messages',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('rechaza mensajes inválidos sin llamar a la API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(sendChatMessage('ok')).rejects.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('incluye el estado HTTP cuando la API falla', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }));

    await expect(sendChatMessage('Prepara una junta extraordinaria')).rejects.toThrow('HTTP 503');
  });
});
