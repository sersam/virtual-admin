import { describe, expect, it } from 'vitest';
import {
  CommunityNoticeDraftRequestSchema,
  CommunityNoticeDraftResponseSchema,
} from './communications.js';

describe('communication contracts', () => {
  it('valida peticiones y respuestas de borrador de comunicado', () => {
    expect(
      CommunityNoticeDraftRequestSchema.parse({
        message: '  Redacta un comunicado sobre el corte de agua.  ',
      }),
    ).toEqual({
      message: 'Redacta un comunicado sobre el corte de agua.',
    });

    expect(
      CommunityNoticeDraftResponseSchema.parse({
        draft: {
          subject: 'Corte de agua',
          body: 'Estimados vecinos:\n\nLes informamos sobre el corte de agua.',
        },
        mode: 'deterministic-demo',
      }),
    ).toMatchObject({ draft: { subject: 'Corte de agua' } });
  });

  it('rechaza mensajes demasiado cortos y respuestas incompletas', () => {
    expect(() => CommunityNoticeDraftRequestSchema.parse({ message: 'ok' })).toThrow();
    expect(() =>
      CommunityNoticeDraftResponseSchema.parse({
        draft: { subject: '', body: 'Contenido' },
        mode: 'deterministic-demo',
      }),
    ).toThrow();
  });

  it('acepta longitudes límite y rechaza mode inválido', () => {
    expect(
      CommunityNoticeDraftRequestSchema.parse({ message: 'a'.repeat(500) }),
    ).toEqual({ message: 'a'.repeat(500) });

    expect(() =>
      CommunityNoticeDraftRequestSchema.parse({ message: '  ab  ' }),
    ).toThrow();

    expect(() =>
      CommunityNoticeDraftResponseSchema.parse({
        draft: { subject: 'Aviso', body: 'Contenido válido' },
        mode: 'other-mode',
      }),
    ).toThrow();
  });
});
