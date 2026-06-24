import { describe, expect, it } from 'vitest';
import { createCommunityNoticeDraft } from './CommunityNoticeDraft.js';

describe('createCommunityNoticeDraft', () => {
  it('redacta un comunicado demo con asunto y cuerpo', () => {
    expect(createCommunityNoticeDraft('Redacta un comunicado sobre el corte de agua.')).toEqual({
      subject: 'Corte de agua',
      body: [
        'Estimados vecinos:',
        '',
        'Les informamos sobre el corte de agua. Rogamos que tengan en cuenta este aviso y que sigan las indicaciones de la administración de la comunidad.',
        '',
        'Gracias por vuestra colaboración.',
        '',
        'La administración de la comunidad',
      ].join('\n'),
    });
  });

  it('normaliza tildes y extrae el tema cuando se usa una preposicion alternativa', () => {
    expect(
      createCommunityNoticeDraft('Redacta un comunicado de la revisión del ascensor.'),
    ).toEqual(
      expect.objectContaining({
        subject: 'Revision del ascensor',
        body: expect.stringContaining('revision del ascensor'),
      }),
    );
  });

  it('usa un tema generico cuando el mensaje no contiene tema reconocible', () => {
    expect(createCommunityNoticeDraft('Necesito ayuda')).toEqual(
      expect.objectContaining({
        subject: 'Aviso de la comunidad',
        body: expect.stringContaining('el aviso de la comunidad'),
      }),
    );
  });
});
