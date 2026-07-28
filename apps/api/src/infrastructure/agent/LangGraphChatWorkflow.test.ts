import { describe, expect, it } from 'vitest';
import type { ChatAgent, DocumentSource } from '@admin/contracts';
import type { ChatIntentClassifier } from '../../application/ports/ChatIntentClassifier.js';
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

describe('LangGraphChatWorkflow', () => {
  it.each([
    {
      agent: 'documentos',
      expectedAnswer: 'La piscina comunitaria abre de 10:00 a 21:00.',
      expectedSources: [poolSource],
      expectedCalls: { documentos: 1 },
      message: '¿Qué dicen las normas de la piscina?',
    },
    {
      agent: 'comunicados',
      expectedAnswer: 'Asunto: Limpieza del garaje\n\nEstimados vecinos:\n\nSe limpiará el garaje.',
      expectedSources: [],
      expectedCalls: { comunicados: 1 },
      message: 'Redacta un comunicado sobre la limpieza del garaje.',
    },
    {
      agent: 'actas',
      expectedAnswer: 'Acta de reunión\n\nTareas:\n- Revisar contrato.',
      expectedSources: [],
      expectedCalls: { actas: 1 },
      message: 'Convierte estas notas en acta formal.',
    },
    {
      agent: 'incidencias',
      expectedAnswer:
        'Incidencia registrada.\nCategoría: Agua\nPrioridad: Urgente\nResponsable sugerido: Fontanería',
      expectedSources: [],
      expectedCalls: { incidencias: 1 },
      message: 'Hay una fuga urgente en el garaje.',
    },
    {
      agent: 'juntas',
      expectedAnswer: 'Orden del día\n\n1. [Alta] Revisar contrato de limpieza.',
      expectedSources: [],
      expectedCalls: { juntas: 1 },
      message: 'Prepara el orden del día de la próxima junta.',
    },
    {
      agent: 'general',
      expectedAnswer:
        'Soy el coordinador de la demo. Puedo derivar peticiones sobre documentos, comunicados, actas, incidencias y preparación de juntas.',
      expectedSources: [],
      expectedCalls: {},
      message: 'Hola, ¿qué puedes hacer?',
    },
  ] satisfies ReadonlyArray<{
    readonly agent: ChatAgent;
    readonly expectedAnswer: string;
    readonly expectedCalls: Partial<Record<ChatAgent, number>>;
    readonly expectedSources: DocumentSource[];
    readonly message: string;
  }>)(
    'enruta $agent por su nodo especializado y conserva la traza',
    async ({ agent, expectedAnswer, expectedCalls, expectedSources, message }) => {
      const calls = createCallCounters();
      const workflow = new LangGraphChatWorkflow(
        createWorkflowDependencies(calls, {
          chatIntentClassifier: classifierReturning(agent, 'openai'),
        }),
      );

      await expect(workflow.run(message, { sessionId: 'session-1' })).resolves.toEqual({
        agent,
        answer: expectedAnswer,
        mode: 'langgraph',
        provider: 'openai',
        sources: expectedSources,
      });
      expect(calls).toEqual({
        actas: expectedCalls.actas ?? 0,
        comunicados: expectedCalls.comunicados ?? 0,
        documentos: expectedCalls.documentos ?? 0,
        incidencias: expectedCalls.incidencias ?? 0,
        juntas: expectedCalls.juntas ?? 0,
      });
    },
  );

  it('propaga la sesión al nodo seleccionado', async () => {
    let receivedSessionId: string | undefined;
    const calls = createCallCounters();
    const workflow = new LangGraphChatWorkflow(
      createWorkflowDependencies(calls, {
        chatIntentClassifier: classifierReturning('documentos'),
        documentAnswerer: {
          execute: async (_question, context) => {
            receivedSessionId = context?.sessionId;

            return {
              answer: 'Respuesta documental.',
              generationMode: 'deterministic-demo',
              mode: 'lexical-demo',
              sources: [],
            };
          },
        },
      }),
    );

    await workflow.run('Consulta documentos.', { sessionId: 'session-1' });

    expect(receivedSessionId).toBe('session-1');
  });

  it('no ejecuta nodos especializados si falla el clasificador', async () => {
    const calls = createCallCounters();
    const workflow = new LangGraphChatWorkflow(
      createWorkflowDependencies(calls, {
        chatIntentClassifier: {
          classify: async () => {
            throw new Error('classifier failure');
          },
        },
      }),
    );

    await expect(workflow.run('Hay una fuga urgente.', { sessionId: 'session-1' })).rejects.toThrow(
      'classifier failure',
    );
    expect(calls).toEqual({
      actas: 0,
      comunicados: 0,
      documentos: 0,
      incidencias: 0,
      juntas: 0,
    });
  });

  it('no registra incidencias ni prepara juntas cuando falta la sesión', async () => {
    const incidentCalls = createCallCounters();
    const incidentWorkflow = new LangGraphChatWorkflow(
      createWorkflowDependencies(incidentCalls, {
        chatIntentClassifier: classifierReturning('incidencias'),
      }),
    );
    const agendaCalls = createCallCounters();
    const agendaWorkflow = new LangGraphChatWorkflow(
      createWorkflowDependencies(agendaCalls, {
        chatIntentClassifier: classifierReturning('juntas'),
      }),
    );

    await expect(incidentWorkflow.run('Hay una fuga urgente.')).resolves.toMatchObject({
      agent: 'incidencias',
      answer: 'No se pudo registrar la incidencia porque no hay una sesión activa.',
      mode: 'langgraph',
      provider: 'deterministic-demo',
      sources: [],
    });
    await expect(agendaWorkflow.run('Prepara la junta.')).resolves.toMatchObject({
      agent: 'juntas',
      answer: 'No se pudo preparar el orden del día porque no hay una sesión activa.',
      mode: 'langgraph',
      provider: 'deterministic-demo',
      sources: [],
    });
    expect(incidentCalls.incidencias).toBe(0);
    expect(agendaCalls.juntas).toBe(0);
  });
});

type CallCounters = Record<
  'actas' | 'comunicados' | 'documentos' | 'incidencias' | 'juntas',
  number
>;
type WorkflowDependencies = ConstructorParameters<typeof LangGraphChatWorkflow>[0];

function createCallCounters(): CallCounters {
  return { actas: 0, comunicados: 0, documentos: 0, incidencias: 0, juntas: 0 };
}

function classifierReturning(
  agent: ChatAgent,
  provider: 'openai' | 'deterministic-demo' = 'deterministic-demo',
): ChatIntentClassifier {
  return {
    classify: async () => ({ agent, provider }),
  };
}

function createWorkflowDependencies(
  calls: CallCounters,
  overrides: Partial<WorkflowDependencies> = {},
): WorkflowDependencies {
  return {
    chatIntentClassifier: classifierReturning('general'),
    communityNoticeDrafter: {
      execute: async () => {
        calls.comunicados += 1;

        return {
          draft: {
            subject: 'Limpieza del garaje',
            body: 'Estimados vecinos:\n\nSe limpiará el garaje.',
          },
          mode: 'deterministic-demo',
        };
      },
    },
    documentAnswerer: {
      execute: async () => {
        calls.documentos += 1;

        return {
          answer: 'La piscina comunitaria abre de 10:00 a 21:00.',
          generationMode: 'deterministic-demo',
          mode: 'lexical-demo',
          sources: [poolSource],
        };
      },
    },
    incidentCreator: {
      execute: async ({
        description,
        sessionId,
      }: {
        readonly description: string;
        readonly sessionId: string;
      }) => {
        calls.incidencias += 1;

        return {
          incident: {
            id: 'incident-1',
            sessionId,
            description,
            type: 'agua',
            priority: 'urgente',
            suggestedResponsible: 'Fontanería',
            suggestedNotice: '',
            createdAt: new Date('2026-07-23T10:00:00.000Z'),
            status: 'pendiente',
            resolvedAt: null,
          },
          mode: 'deterministic-demo',
        };
      },
    },
    meetingAgendaDrafter: {
      execute: async () => {
        calls.juntas += 1;

        return {
          draft: {
            title: 'Orden del día',
            body: 'Orden del día\n\n1. [Alta] Revisar contrato de limpieza.',
            items: [],
          },
          meeting: {
            id: 'meeting-ordinary-2026-09-18',
            kind: 'ordinaria',
            title: 'Junta ordinaria',
            scheduledAt: '2026-09-18T17:00:00.000Z',
          },
          mode: 'deterministic-demo',
        };
      },
    },
    meetingMinutesDrafter: {
      execute: async () => {
        calls.actas += 1;

        return {
          draft: {
            title: 'Acta de reunión',
            body: 'Acta de reunión\n\nTareas:\n- Revisar contrato.',
            tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
          },
          mode: 'deterministic-demo',
        };
      },
    },
    ...overrides,
  };
}
