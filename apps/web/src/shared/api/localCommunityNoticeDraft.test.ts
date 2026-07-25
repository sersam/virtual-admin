import { describe, expect, it } from 'vitest';
import { createLocalCommunityNoticeDraft } from './localCommunityNoticeDraft';

describe('createLocalCommunityNoticeDraft', () => {
  it('redacta un borrador local estructurado', () => {
    expect(
      createLocalCommunityNoticeDraft({
        subject: 'Corte de agua',
        type: 'informativo',
        audience: 'todos',
        tone: 'formal',
      }),
    ).toEqual({
      draft: {
        subject: 'Corte de agua',
        body: expect.stringContaining('Estimados vecinos:'),
      },
      mode: 'deterministic-demo',
    });
  });

  it.each([
    ['demasiado corto', 'ok'],
    ['demasiado largo', 'a'.repeat(121)],
    ['solo espacios', '   '],
  ])('rechaza asuntos con formato inválido: %s', (_caseName, subject) => {
    expect(() =>
      createLocalCommunityNoticeDraft({
        subject,
        type: 'informativo',
        audience: 'todos',
        tone: 'formal',
      }),
    ).toThrow();
  });
});
