import { describe, expect, it } from 'vitest';
import { draftCommunityNotice } from './CommunityNoticeDraft.js';

describe('draftCommunityNotice', () => {
  it('redacta un comunicado demo con asunto, cuerpo y cierre', () => {
    const draft = draftCommunityNotice('Redacta un comunicado para avisar del corte de agua.');

    expect(draft).toContain('Asunto: Corte de agua');
    expect(draft).toContain('Estimados vecinos:');
    expect(draft).toContain('corte de agua');
    expect(draft).toContain('Gracias por vuestra colaboración.');
  });
});
