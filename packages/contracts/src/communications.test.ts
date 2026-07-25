import { describe, expect, it } from 'vitest';
import {
  CommunityNoticeAudienceSchema,
  CommunityNoticeDraftRequestSchema,
  CommunityNoticeDraftResponseSchema,
  CommunityNoticeToneSchema,
  CommunityNoticeTypeSchema,
} from './communications.js';

describe('communication contracts', () => {
  it('valida peticiones y respuestas de borrador de comunicado', () => {
    expect(
      CommunityNoticeDraftRequestSchema.parse({
        subject: '  Corte de agua  ',
        type: 'informativo',
        audience: 'todos',
        tone: 'formal',
      }),
    ).toEqual({
      subject: 'Corte de agua',
      type: 'informativo',
      audience: 'todos',
      tone: 'formal',
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

  it('rechaza asuntos demasiado cortos, catalogos invalidos y respuestas incompletas', () => {
    const validRequest = {
      subject: 'Corte de agua',
      type: 'informativo',
      audience: 'todos',
      tone: 'formal',
    };

    expect(() =>
      CommunityNoticeDraftRequestSchema.parse({ ...validRequest, subject: 'ok' }),
    ).toThrow();
    expect(() =>
      CommunityNoticeDraftRequestSchema.parse({ ...validRequest, type: 'promocional' }),
    ).toThrow();
    expect(() =>
      CommunityNoticeDraftRequestSchema.parse({ ...validRequest, audience: 'proveedores' }),
    ).toThrow();
    expect(() =>
      CommunityNoticeDraftRequestSchema.parse({ ...validRequest, tone: 'alarmista' }),
    ).toThrow();
    expect(() =>
      CommunityNoticeDraftResponseSchema.parse({
        draft: { subject: '', body: 'Contenido' },
        mode: 'deterministic-demo',
      }),
    ).toThrow();
  });

  it('acepta longitudes límite y rechaza mode inválido', () => {
    expect(
      CommunityNoticeDraftRequestSchema.parse({
        subject: 'a'.repeat(120),
        type: 'urgente',
        audience: 'residentes',
        tone: 'directo',
      }),
    ).toEqual({
      subject: 'a'.repeat(120),
      type: 'urgente',
      audience: 'residentes',
      tone: 'directo',
    });

    expect(
      CommunityNoticeDraftResponseSchema.parse({
        draft: { subject: 'Aviso', body: 'Contenido válido generado por OpenAI' },
        mode: 'openai',
      }).mode,
    ).toBe('openai');

    expect(() =>
      CommunityNoticeDraftRequestSchema.parse({
        subject: 'a'.repeat(121),
        type: 'informativo',
        audience: 'todos',
        tone: 'formal',
      }),
    ).toThrow();

    expect(() =>
      CommunityNoticeDraftResponseSchema.parse({
        draft: { subject: 'Aviso', body: 'Contenido válido' },
        mode: 'other-mode',
      }),
    ).toThrow();
  });

  it('expone los catalogos de tipo, audiencia y tono', () => {
    expect(CommunityNoticeTypeSchema.options).toEqual(['informativo', 'recordatorio', 'urgente']);
    expect(CommunityNoticeAudienceSchema.options).toEqual(['todos', 'propietarios', 'residentes']);
    expect(CommunityNoticeToneSchema.options).toEqual(['formal', 'cercano', 'directo']);
  });
});
