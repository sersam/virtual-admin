import { describe, expect, it } from 'vitest';
import { DraftCommunityNotice } from './DraftCommunityNotice.js';

describe('DraftCommunityNotice', () => {
  it('devuelve un borrador estructurado para transporte API', async () => {
    const useCase = new DraftCommunityNotice({
      generator: {
        draft: async () => ({
          draft: {
            subject: 'Limpieza del garaje',
            body: 'Estimados vecinos:\n\nContenido del aviso.',
          },
          mode: 'deterministic-demo',
        }),
      },
    });

    await expect(
      useCase.execute('Redacta un comunicado sobre la limpieza del garaje.'),
    ).resolves.toEqual({
      draft: {
        subject: 'Limpieza del garaje',
        body: expect.stringContaining('Estimados vecinos:'),
      },
      mode: 'deterministic-demo',
    });
  });

  it('propaga el modo del proveedor OpenAI', async () => {
    const useCase = new DraftCommunityNotice({
      generator: {
        draft: async (message) => ({
          draft: {
            subject: 'Corte de agua',
            body: `Aviso generado para: ${message}`,
          },
          mode: 'openai',
        }),
      },
    });

    await expect(useCase.execute('Redacta un aviso de corte de agua.')).resolves.toEqual({
      draft: {
        subject: 'Corte de agua',
        body: 'Aviso generado para: Redacta un aviso de corte de agua.',
      },
      mode: 'openai',
    });
  });
});
