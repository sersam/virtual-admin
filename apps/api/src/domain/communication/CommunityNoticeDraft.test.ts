import { describe, expect, it } from 'vitest';
import { createCommunityNoticeDraft, draftCommunityNotice } from './CommunityNoticeDraft.js';

describe('draftCommunityNotice', () => {
  it('redacta un comunicado demo con asunto, cuerpo y cierre', () => {
    const draft = draftCommunityNotice('Redacta un comunicado para avisar del corte de agua.');

    expect(draft).toContain('Asunto: Corte de agua');
    expect(draft).toContain('Estimados vecinos:');
    expect(draft).toContain('Corte de agua');
    expect(draft).toContain('Gracias por vuestra colaboración.');
  });

  it('inserta el asunto en el cuerpo con una representación natural y sin doble punto', () => {
    const draftWithPunctuation = createCommunityNoticeDraft({
      subject: 'Corte de agua.',
      type: 'informativo',
      audience: 'todos',
      tone: 'formal',
    });
    const draftWithoutPunctuation = createCommunityNoticeDraft({
      subject: 'Corte de agua',
      type: 'informativo',
      audience: 'todos',
      tone: 'formal',
    });

    expect(draftWithPunctuation.body).toContain('sobre el asunto «Corte de agua».');
    expect(draftWithPunctuation.body).not.toContain('Corte de agua..');
    expect(draftWithoutPunctuation.body).toContain('sobre el asunto «Corte de agua».');
  });

  it('conserva un tema directo aunque empiece con una palabra genérica', () => {
    const draftWithSeparator = draftCommunityNotice('Aviso: cambio de horario del ascensor');
    const draftWithoutSeparator = draftCommunityNotice('Aviso cambio de horario del ascensor');

    expect(draftWithSeparator).toContain('Asunto: Cambio de horario del ascensor');
    expect(draftWithoutSeparator).toContain('Asunto: Cambio de horario del ascensor');
    expect(draftWithSeparator).not.toContain('Asunto: Aviso de la comunidad');
  });

  it('limita el asunto explícito a la primera frase', () => {
    const draft = draftCommunityNotice(
      'Redacta un comunicado sobre el corte de agua. La intervención será mañana.',
    );

    expect(draft).toContain('Asunto: Corte de agua');
    expect(draft).not.toContain('Asunto: Corte de agua. La intervención será mañana');
  });
});
