import { describe, expect, it } from 'vitest';
import {
  buildCommunityNoticeInputFromText,
  createCommunityNoticeDraft,
} from './CommunityNoticeDraft.js';

describe('createCommunityNoticeDraft', () => {
  it('redacta un comunicado demo con asunto y cuerpo desde input estructurado', () => {
    expect(
      createCommunityNoticeDraft({
        subject: 'Corte de agua',
        type: 'informativo',
        audience: 'todos',
        tone: 'formal',
      }),
    ).toEqual({
      subject: 'Corte de agua',
      body: [
        'Estimados vecinos:',
        '',
        'Les informamos sobre Corte de agua. Rogamos que tengan en cuenta este aviso y que sigan las indicaciones de la administración de la comunidad.',
        '',
        'Gracias por vuestra colaboración.',
        '',
        'La administración de la comunidad',
      ].join('\n'),
    });
  });

  it('ajusta el saludo por audiencia', () => {
    expect(
      createCommunityNoticeDraft({
        subject: 'Junta extraordinaria',
        type: 'informativo',
        audience: 'propietarios',
        tone: 'formal',
      }).body,
    ).toContain('Estimados propietarios:');

    expect(
      createCommunityNoticeDraft({
        subject: 'Uso de la piscina',
        type: 'informativo',
        audience: 'residentes',
        tone: 'formal',
      }).body,
    ).toContain('Estimados residentes:');
  });

  it('ajusta el proposito por tipo', () => {
    expect(
      createCommunityNoticeDraft({
        subject: 'Pago de cuotas',
        type: 'recordatorio',
        audience: 'todos',
        tone: 'formal',
      }).body,
    ).toContain('Les recordamos Pago de cuotas.');

    expect(
      createCommunityNoticeDraft({
        subject: 'Fuga en el garaje',
        type: 'urgente',
        audience: 'todos',
        tone: 'formal',
      }).body,
    ).toContain('Les informamos con caracter urgente sobre Fuga en el garaje.');
  });

  it('ajusta el cierre por tono', () => {
    expect(
      createCommunityNoticeDraft({
        subject: 'Limpieza del garaje',
        type: 'informativo',
        audience: 'todos',
        tone: 'cercano',
      }).body,
    ).toContain('Gracias por ayudarnos a mantener una convivencia agradable.');

    expect(
      createCommunityNoticeDraft({
        subject: 'Corte de agua',
        type: 'informativo',
        audience: 'todos',
        tone: 'directo',
      }).body,
    ).toContain('Por favor, revisen este aviso y actuen en consecuencia.');
  });

  it('calcula valores por defecto coherentes desde texto de chat', () => {
    expect(
      buildCommunityNoticeInputFromText('Redacta un comunicado sobre la limpieza del garaje.'),
    ).toEqual({
      subject: 'Limpieza del garaje',
      type: 'informativo',
      audience: 'todos',
      tone: 'formal',
    });
  });

  it('preserva tildes y extrae el asunto cuando se usa una preposicion alternativa', () => {
    expect(
      buildCommunityNoticeInputFromText('Redacta un comunicado de la revisión del ascensor.'),
    ).toEqual(
      expect.objectContaining({
        subject: 'Revisión del ascensor',
      }),
    );
  });

  it('usa un tema directo sin sustituirlo por el aviso genérico', () => {
    expect(buildCommunityNoticeInputFromText('Corte de agua')).toEqual(
      expect.objectContaining({
        subject: 'Corte de agua',
      }),
    );
  });

  it('prioriza marcadores de tema explícitos aunque aparezcan otros antes', () => {
    expect(
      buildCommunityNoticeInputFromText(
        'Necesito un comunicado del administrador sobre el corte de agua.',
      ),
    ).toEqual(
      expect.objectContaining({
        subject: 'Corte de agua',
      }),
    );
  });

  it('elimina puntuación final habitual del tema', () => {
    expect(buildCommunityNoticeInputFromText('Comunicado sobre poda urgente!')).toEqual(
      expect.objectContaining({
        subject: 'Poda urgente',
      }),
    );
    expect(buildCommunityNoticeInputFromText('Corte de agua?')).toEqual(
      expect.objectContaining({
        subject: 'Corte de agua',
      }),
    );
  });

  it('usa un asunto generico cuando el mensaje no contiene tema reconocible', () => {
    expect(buildCommunityNoticeInputFromText('Necesito ayuda')).toEqual(
      expect.objectContaining({
        subject: 'Aviso de la comunidad',
      }),
    );
  });
});
