import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryDocuments } from './queryDocuments';

describe('queryDocuments', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envía la consulta documental y valida la respuesta', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          answer: 'La piscina abre de 10:00 a 21:00.',
          mode: 'lexical-demo',
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

    const response = await queryDocuments('¿Cuál es el horario de piscina?');

    expect(response.sources[0]?.id).toBe('normas-piscina');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/api/documents/query',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('incluye el estado HTTP cuando la API falla', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

    await expect(queryDocuments('¿Qué dice el acta del ascensor?')).rejects.toThrow('HTTP 500');
  });
});
