import { describe, expect, it } from 'vitest';
import { createLocalChatMessage } from './localChatMessage';

describe('createLocalChatMessage', () => {
  it('clasifica consultas documentales con fuentes locales', () => {
    const response = createLocalChatMessage('¿Qué dicen las normas de la piscina?');

    expect(response.agent).toBe('documentos');
    expect(response.mode).toBe('local-demo');
    expect(response.sources[0]?.id).toBe('normas-piscina');
  });

  it('clasifica intenciones futuras sin simular acciones', () => {
    const response = createLocalChatMessage('Redacta un comunicado sobre el corte de agua.');

    expect(response.agent).toBe('comunicados');
    expect(response.answer).toContain('agente de comunicados');
    expect(response.sources).toEqual([]);
  });
});
