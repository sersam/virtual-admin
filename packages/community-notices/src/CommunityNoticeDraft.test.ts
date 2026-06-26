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

  it('preserva tildes y extrae el tema cuando se usa una preposicion alternativa', () => {
    expect(
      createCommunityNoticeDraft('Redacta un comunicado de la revisión del ascensor.'),
    ).toEqual(
      expect.objectContaining({
        subject: 'Revisión del ascensor',
        body: expect.stringContaining('revisión del ascensor'),
      }),
    );
  });

  it('usa un tema directo sin sustituirlo por el aviso genérico', () => {
    expect(createCommunityNoticeDraft('Corte de agua')).toEqual(
      expect.objectContaining({
        subject: 'Corte de agua',
        body: expect.stringContaining('Corte de agua'),
      }),
    );
  });

  it('prioriza marcadores de tema explícitos aunque aparezcan otros antes', () => {
    expect(
      createCommunityNoticeDraft(
        'Necesito un comunicado del administrador sobre el corte de agua.',
      ),
    ).toEqual(
      expect.objectContaining({
        subject: 'Corte de agua',
        body: expect.stringContaining('el corte de agua'),
      }),
    );
  });

  it('elimina puntuación final habitual del tema', () => {
    expect(createCommunityNoticeDraft('Comunicado sobre poda urgente!')).toEqual(
      expect.objectContaining({
        subject: 'Poda urgente',
        body: expect.stringContaining('poda urgente'),
      }),
    );
    expect(createCommunityNoticeDraft('Corte de agua?')).toEqual(
      expect.objectContaining({
        subject: 'Corte de agua',
        body: expect.stringContaining('Corte de agua'),
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
