import type {
  ChatAgent,
  CommunityNoticeDraftResponse,
  DocumentQueryResponse,
  MeetingAgendaDraftResponse,
  MeetingMinutesDraftResponse,
} from '@admin/contracts';
import type { IncidentEvaluationOutput } from './EvaluationRunner.js';
import { describe, expect, it } from 'vitest';
import { runEvaluation } from './EvaluationRunner.js';
import type { EvaluationDatasets } from './evaluationTypes.js';

describe('EvaluationRunner', () => {
  it('ejecuta todos los casos, agrega puntuaciones y no incluye entradas completas', async () => {
    const result = await runEvaluation({
      commit: 'abc123',
      datasets: createDatasets(),
      generatedAt: new Date('2026-08-04T10:00:00.000Z'),
      mode: 'demo',
      ports: createPorts(),
    });

    expect(result.totalCases).toBe(6);
    expect(result.macroScore).toBe(1);
    expect(result.capabilities.map(({ capability, score }) => ({ capability, score }))).toEqual([
      { capability: 'rag', score: 1 },
      { capability: 'coordinacion', score: 1 },
      { capability: 'incidencias', score: 1 },
      { capability: 'comunicados', score: 1 },
      { capability: 'actas', score: 1 },
      { capability: 'juntas', score: 1 },
    ]);
    expect(JSON.stringify(result)).not.toContain('texto sensible de entrada');
  });

  it('continua tras errores aislados y devuelve diagnosticos saneados', async () => {
    const result = await runEvaluation({
      commit: 'abc123',
      datasets: createDatasets(),
      generatedAt: new Date('2026-08-04T10:00:00.000Z'),
      mode: 'openai',
      ports: createPorts({
        answerDocumentQuestion: async () => {
          throw new Error('Fallo con sk-secret y texto sensible de entrada '.repeat(20));
        },
      }),
    });

    expect(result.totalCases).toBe(6);
    expect(result.technicalErrors).toBe(1);
    expect(result.cases.find(({ id }) => id === 'rag-test')?.error).toBeDefined();
    expect(JSON.stringify(result)).not.toContain('sk-secret');
    expect(JSON.stringify(result)).not.toContain('texto sensible de entrada');
  });
});

function createDatasets(): EvaluationDatasets {
  return {
    actas: [
      {
        expectedAgreements: ['aprobar limpieza'],
        expectedTasks: [
          { assignee: 'Ana', description: 'Ana avisara el viernes', dueDate: 'viernes' },
        ],
        forbiddenClaims: ['derrame'],
        id: 'minutes-test',
        notes: 'texto sensible de entrada',
      },
    ],
    comunicados: [
      {
        forbiddenClaims: ['multa'],
        id: 'notice-test',
        input: {
          audience: 'todos',
          subject: 'Revision de garaje',
          tone: 'formal',
          type: 'informativo',
        },
        requiredConcepts: ['Revision de garaje'],
      },
    ],
    coordinacion: [
      {
        expectedAgent: 'documentos',
        id: 'coord-test',
        message: 'texto sensible de entrada',
      },
    ],
    incidencias: [
      {
        description: 'texto sensible de entrada fuga de agua',
        expectedPriority: 'alta',
        expectedType: 'agua',
        forbiddenClaims: ['cerrada'],
        id: 'incident-test',
        requiredNoticeConcepts: ['fuga de agua'],
      },
    ],
    juntas: [
      {
        emptyExpected: false,
        expectedBodyConcepts: ['fuga de agua'],
        expectedItems: [{ sourceId: 'agenda-inc', sourceType: 'incident' }],
        forbiddenClaims: ['aprobada'],
        id: 'agenda-test',
        meetingId: 'meeting-1',
        seed: { incidents: [], pendingAgreements: [], proposals: [] },
      },
    ],
    rag: [
      {
        documents: [
          {
            content: 'La piscina abre de 10:00 a 21:00.',
            documentUrl: '/documents/test.pdf',
            id: 'doc-1',
            section: 'Horario',
            title: 'Piscina',
            type: 'comunicado',
          },
        ],
        expectedCitedSourceIds: ['doc-1'],
        expectedFacts: ['10:00', '21:00'],
        expectedSourceIds: ['doc-1'],
        id: 'rag-test',
        insufficientEvidence: false,
        question: 'texto sensible de entrada',
      },
    ],
  };
}

function createPorts(
  overrides: Partial<Parameters<typeof runEvaluation>[0]['ports']> = {},
): Parameters<typeof runEvaluation>[0]['ports'] {
  return {
    answerDocumentQuestion: async (): Promise<DocumentQueryResponse> => ({
      answer: 'La piscina abre de 10:00 a 21:00.',
      generationMode: 'deterministic-demo',
      mode: 'lexical-demo',
      sources: [
        {
          documentUrl: '/documents/test.pdf',
          excerpt: 'La piscina abre de 10:00 a 21:00.',
          id: 'doc-1',
          score: 1,
          section: 'Horario',
          title: 'Piscina',
          type: 'comunicado',
        },
      ],
    }),
    classifyChatIntent: async (): Promise<ChatAgent> => 'documentos',
    createIncident: async (): Promise<IncidentEvaluationOutput> => ({
      incident: {
        priority: 'alta',
        suggestedNotice: 'Se ha registrado fuga de agua.',
        type: 'agua',
      },
    }),
    draftCommunityNotice: async (): Promise<CommunityNoticeDraftResponse> => ({
      draft: { body: 'Informamos sobre Revision de garaje.', subject: 'Revision de garaje' },
      mode: 'deterministic-demo',
    }),
    draftMeetingAgenda: async (): Promise<MeetingAgendaDraftResponse> => ({
      draft: {
        body: 'Orden del dia\nFuga de agua',
        items: [
          {
            description: 'Fuga de agua',
            priority: 'alta',
            sourceId: 'agenda-inc',
            sourceType: 'incident',
          },
        ],
        title: 'Orden del dia',
      },
      meeting: {
        id: 'meeting-1',
        kind: 'ordinaria',
        scheduledAt: '2026-09-18T17:00:00.000Z',
        title: 'Junta ordinaria',
      },
      mode: 'deterministic-demo',
    }),
    draftMeetingMinutes: async (): Promise<MeetingMinutesDraftResponse> => ({
      draft: {
        agreements: ['aprobar limpieza'],
        body: 'Se acuerda aprobar limpieza. Ana avisara el viernes.',
        tasks: [{ assignee: 'Ana', description: 'Ana avisara el viernes', dueDate: 'viernes' }],
        title: 'Acta',
      },
      mode: 'deterministic-demo',
    }),
    ...overrides,
  };
}
