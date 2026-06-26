import { describe, expect, it } from 'vitest';
import { createLocalChatMessage } from './localChatMessage';

describe('createLocalChatMessage', () => {
  it('clasifica consultas documentales con fuentes locales', () => {
    const response = createLocalChatMessage('¿Qué dicen las normas de la piscina?');

    expect(response.agent).toBe('documentos');
    expect(response.mode).toBe('local-demo');
    expect(response.sources[0]?.id).toBe('normas-piscina');
  });

  it('redacta comunicados demo en modo local', () => {
    const response = createLocalChatMessage('Redacta un comunicado sobre el corte de agua.');

    expect(response.agent).toBe('comunicados');
    expect(response.answer).toContain('Asunto: Corte de agua');
    expect(response.answer).toContain('Estimados vecinos:');
    expect(response.sources).toEqual([]);
  });

  it('genera actas demo en modo local', () => {
    const response = createLocalChatMessage(
      [
        'Junta ordinaria del 12 de junio.',
        'Acuerdo: aprobar presupuesto.',
        'Tarea: Revisar contrato; Responsable: Ana',
      ].join('\n'),
    );

    expect(response.agent).toBe('actas');
    expect(response.answer).toContain('Acta de reunión');
    expect(response.answer).toContain('Acuerdos:');
    expect(response.answer).toContain('Revisar contrato');
    expect(response.sources).toEqual([]);
  });
});
