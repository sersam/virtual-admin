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

  it('mantiene documentos cuando una consulta documental menciona un acuerdo', () => {
    const response = createLocalChatMessage(
      'Consulta los documentos sobre el acuerdo del contrato del ascensor.',
    );

    expect(response.agent).toBe('documentos');
    expect(response.sources.length).toBeGreaterThan(0);
  });

  it('responde de forma segura cuando la petición de actas es demasiado corta', () => {
    const response = createLocalChatMessage('acta');

    expect(response.agent).toBe('actas');
    expect(response.answer).toContain('Necesito unas notas');
    expect(response.sources).toEqual([]);
  });

  it('clasifica incidencias en fallback local sin simular su registro', () => {
    const response = createLocalChatMessage('Hay una fuga de agua urgente en el garaje.');

    expect(response).toEqual({
      agent: 'incidencias',
      answer: [
        'Clasificación local de la incidencia.',
        'Categoría: Agua',
        'Prioridad: Urgente',
        'Responsable sugerido: Fontanería',
        'No se ha registrado porque la API de sesión no está disponible.',
      ].join('\n'),
      mode: 'local-demo',
      sources: [],
    });
  });

  it('clasifica juntas en fallback local sin simular entradas de sesión', () => {
    const response = createLocalChatMessage('Prepara el orden del día de la próxima junta.');

    expect(response).toEqual({
      agent: 'juntas',
      answer:
        'Puedo clasificar la petición de juntas, pero necesito la API de sesión para preparar un orden del día con incidencias y acuerdos pendientes reales.',
      mode: 'local-demo',
      sources: [],
    });
  });
});
