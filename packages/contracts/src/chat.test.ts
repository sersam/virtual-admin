import { describe, expect, it } from 'vitest';
import {
  ChatAgentSchema,
  ChatMessageRequestSchema,
  ChatMessageResponseSchema,
  ChatModeSchema,
  ChatProviderSchema,
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

  it('define todos los agentes del MVP, modos y proveedores esperados', () => {
    expect(ChatAgentSchema.options).toEqual([
      'documentos',
      'comunicados',
      'actas',
      'incidencias',
      'juntas',
      'general',
    ]);
    expect(ChatModeSchema.options).toEqual(['langgraph', 'local-demo']);
    expect(ChatProviderSchema.options).toEqual(['openai', 'deterministic-demo']);
  });

  it('valida respuestas del coordinador con fuentes reales cuando existen', () => {
    expect(
      ChatMessageResponseSchema.parse({
        agent: 'documentos',
        answer: 'Según la documentación recuperada, la piscina abre de 10:00 a 21:00.',
        mode: 'langgraph',
        provider: 'openai',
        sources: [validSource],
      }),
    ).toEqual({
      agent: 'documentos',
      answer: 'Según la documentación recuperada, la piscina abre de 10:00 a 21:00.',
      mode: 'langgraph',
      provider: 'openai',
      sources: [validSource],
    });
  });

  it('acepta un motivo de fallback determinista visible', () => {
    expect(
      ChatMessageResponseSchema.parse({
        agent: 'general',
        answer: 'Respuesta local de demostración.',
        fallbackReason: 'provider-error',
        mode: 'local-demo',
        provider: 'deterministic-demo',
        sources: [],
      }),
    ).toMatchObject({ fallbackReason: 'provider-error' });
  });

  it('rechaza fuentes documentales simuladas o incompletas', () => {
    expect(() =>
      ChatMessageResponseSchema.parse({
        agent: 'documentos',
        answer: 'Respuesta sin fuente válida.',
        mode: 'langgraph',
        provider: 'deterministic-demo',
        sources: [{ ...validSource, documentUrl: '/documents/fuente.txt' }],
      }),
    ).toThrow();
  });

  it('rechaza proveedores no soportados o ausentes', () => {
    const base = {
      agent: 'documentos',
      answer: 'Respuesta válida.',
      mode: 'langgraph',
      sources: [validSource],
    };

    expect(() => ChatMessageResponseSchema.parse(base)).toThrow();
    expect(() => ChatMessageResponseSchema.parse({ ...base, provider: 'anthropic' })).toThrow();
  });
});
