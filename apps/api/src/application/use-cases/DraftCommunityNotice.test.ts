import { describe, expect, it } from 'vitest';
import { DraftCommunityNotice } from './DraftCommunityNotice.js';

describe('DraftCommunityNotice', () => {
  it('devuelve un borrador estructurado para transporte API', async () => {
    const receivedInputs: unknown[] = [];
    const useCase = new DraftCommunityNotice({
      generator: {
        draft: async (input) => {
          receivedInputs.push(input);

          return {
            draft: {
              subject: 'Limpieza del garaje',
              body: 'Estimados vecinos:\n\nContenido del aviso.',
            },
            mode: 'deterministic-demo',
          };
        },
      },
    });

    await expect(
      useCase.execute({
        subject: 'Limpieza del garaje',
        type: 'informativo',
        audience: 'todos',
        tone: 'formal',
      }),
    ).resolves.toEqual({
      draft: {
        subject: 'Limpieza del garaje',
        body: expect.stringContaining('Estimados vecinos:'),
      },
      mode: 'deterministic-demo',
    });
    expect(receivedInputs).toEqual([
      {
        subject: 'Limpieza del garaje',
        type: 'informativo',
        audience: 'todos',
        tone: 'formal',
      },
    ]);
  });

  it('propaga el modo del proveedor OpenAI', async () => {
    const useCase = new DraftCommunityNotice({
      generator: {
        draft: async (input) => ({
          draft: {
            subject: input.subject,
            body: `Aviso generado para: ${input.subject}`,
          },
          mode: 'openai',
        }),
      },
    });

    await expect(
      useCase.execute({
        subject: 'Corte de agua',
        type: 'urgente',
        audience: 'residentes',
        tone: 'directo',
      }),
    ).resolves.toEqual({
      draft: {
        subject: 'Corte de agua',
        body: 'Aviso generado para: Corte de agua',
      },
      mode: 'openai',
    });
  });
});
