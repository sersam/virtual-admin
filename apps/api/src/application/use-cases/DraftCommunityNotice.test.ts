import { describe, expect, it } from 'vitest';
import { DraftCommunityNotice } from './DraftCommunityNotice.js';

describe('DraftCommunityNotice', () => {
  it('devuelve un borrador estructurado para transporte API', async () => {
    const useCase = new DraftCommunityNotice();

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
});
