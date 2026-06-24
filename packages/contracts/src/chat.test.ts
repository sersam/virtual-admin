import { describe, expect, it } from 'vitest';
import {
  ChatAgentSchema,
  ChatMessageRequestSchema,
  ChatMessageResponseSchema,
  ChatModeSchema,
} from './chat';

const validSource = {
  id: 'normas-piscina',
  title: 'Normas de uso de zonas comunes',
  type: 'normas',
  section: 'Piscina',
  excerpt: 'La piscina comunitaria abre de 10:00 a 21:00.',
  documentUrl: '/documents/normas-zonas-comunes.pdf',
  score: 0.9,
};

describe('chat contracts', () => {
  it('valida mensajes libres entre 3 y 500 caracteres', () => {
    expect(ChatMessageRequestSchema.parse({ message: '  Hola coordinador  ' })).toEqual({
      message: 'Hola coordinador',
    });

    expect(() => ChatMessageRequestSchema.parse({ message: 'ok' })).toThrow();
    expect(() => ChatMessageRequestSchema.parse({ message: 'a'.repeat(501) })).toThrow();
  });

  it('define todos los agentes del MVP y modos esperados', () => {
    expect(ChatAgentSchema.options).toEqual([
      'documentos',
      'comunicados',
      'actas',
      'incidencias',
      'juntas',
      'general',
    ]);
    expect(ChatModeSchema.options).toEqual(['langgraph-demo', 'local-demo']);
  });

  it('valida respuestas del coordinador con fuentes reales cuando existen', () => {
    expect(
      ChatMessageResponseSchema.parse({
        agent: 'documentos',
        answer: 'Según la documentación recuperada, la piscina abre de 10:00 a 21:00.',
        mode: 'langgraph-demo',
        sources: [validSource],
      }),
    ).toEqual({
      agent: 'documentos',
      answer: 'Según la documentación recuperada, la piscina abre de 10:00 a 21:00.',
      mode: 'langgraph-demo',
      sources: [validSource],
    });
  });

  it('rechaza fuentes documentales simuladas o incompletas', () => {
    expect(() =>
      ChatMessageResponseSchema.parse({
        agent: 'documentos',
        answer: 'Respuesta sin fuente válida.',
        mode: 'langgraph-demo',
        sources: [{ ...validSource, documentUrl: '/documents/fuente.txt' }],
      }),
    ).toThrow();
  });
});
