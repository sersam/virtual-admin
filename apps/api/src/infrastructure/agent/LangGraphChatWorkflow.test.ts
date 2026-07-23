import { describe, expect, it } from 'vitest';
import type { DocumentSource } from '@admin/contracts';
import { LangGraphChatWorkflow } from './LangGraphChatWorkflow.js';

const poolSource: DocumentSource = {
  id: 'normas-piscina',
  title: 'Normas de uso de zonas comunes',
  type: 'normas',
  section: 'Piscina',
  excerpt: 'La piscina comunitaria abre de 10:00 a 21:00.',
  documentUrl: '/documents/normas-zonas-comunes.pdf',
  score: 0.9,
};

const unusedIncidentCreator = {
  execute: async () => {
    throw new Error('No debería registrar incidencias');
  },
};

describe('LangGraphChatWorkflow', () => {
  it('clasifica consultas documentales y reutiliza el RAG existente', async () => {
    let receivedSessionId: string | undefined;
    const workflow = new LangGraphChatWorkflow({
      documentAnswerer: {
        execute: async (_question, context) => {
          receivedSessionId = context?.sessionId;

          return {
            answer: 'La piscina comunitaria abre de 10:00 a 21:00.',
            mode: 'lexical-demo',
            sources: [poolSource],
          };
        },
      },
      incidentCreator: unusedIncidentCreator,
    });

    await expect(
      workflow.run('¿Qué dicen las normas de la piscina?', { sessionId: 'session-1' }),
    ).resolves.toEqual({
      agent: 'documentos',
      answer: 'La piscina comunitaria abre de 10:00 a 21:00.',
      mode: 'langgraph-demo',
      sources: [poolSource],
    });
    expect(receivedSessionId).toBe('session-1');
  });

  it('redacta comunicados demo sin consultar fuentes documentales', async () => {
    const workflow = new LangGraphChatWorkflow({
      documentAnswerer: {
        execute: async () => {
          throw new Error('No debería consultar documentos');
        },
      },
      incidentCreator: unusedIncidentCreator,
    });

    const response = await workflow.run('Redacta un comunicado sobre la limpieza del garaje.');

    expect(response.agent).toBe('comunicados');
    expect(response.answer).toContain('Asunto: Limpieza del garaje');
    expect(response.answer).toContain('Estimados vecinos:');
    expect(response.answer).toContain('limpieza del garaje');
    expect(response.sources).toEqual([]);
  });

  it('genera actas demo desde notas de reunión sin consultar fuentes documentales', async () => {
    const workflow = new LangGraphChatWorkflow({
      documentAnswerer: {
        execute: async () => {
          throw new Error('No debería consultar documentos');
        },
      },
      incidentCreator: unusedIncidentCreator,
    });

    const response = await workflow.run(
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

  it('registra y clasifica incidencias en la sesión desde el chat', async () => {
    let receivedSessionId: string | undefined;
    let receivedDescription: string | undefined;
    const workflow = new LangGraphChatWorkflow({
      documentAnswerer: {
        execute: async () => {
          throw new Error('No debería consultar documentos');
        },
      },
      incidentCreator: {
        execute: async ({ description, sessionId }) => {
          receivedDescription = description;
          receivedSessionId = sessionId;

          return {
            id: 'incident-1',
            description,
            type: 'agua',
            priority: 'urgente',
            suggestedResponsible: 'Fontanería',
            createdAt: '2026-07-23T10:00:00.000Z',
          };
        },
      },
    });

    const response = await workflow.run('Hay una fuga de agua urgente en el garaje.', {
      sessionId: 'session-1',
    });

    expect(receivedDescription).toBe('Hay una fuga de agua urgente en el garaje.');
    expect(receivedSessionId).toBe('session-1');
    expect(response).toEqual({
      agent: 'incidencias',
      answer:
        'Incidencia registrada.\nCategoría: Agua\nPrioridad: Urgente\nResponsable sugerido: Fontanería',
      mode: 'langgraph-demo',
      sources: [],
    });
  });

  it('no intenta registrar una incidencia cuando falta la sesión', async () => {
    const workflow = new LangGraphChatWorkflow({
      documentAnswerer: {
        execute: async () => {
          throw new Error('No debería consultar documentos');
        },
      },
      incidentCreator: unusedIncidentCreator,
    });

    const response = await workflow.run('Hay una fuga de agua urgente en el garaje.');

    expect(response.answer).toBe(
      'No se pudo registrar la incidencia porque no hay una sesión activa.',
    );
  });
});
