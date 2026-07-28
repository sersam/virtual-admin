import { PostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { DemoSession } from '../../domain/session/DemoSession.js';
import { LexicalDocumentRetriever } from '../../infrastructure/document/LexicalDocumentRetriever.js';
import { residencialSierraNevadaDocuments } from '../../infrastructure/document/residencialSierraNevadaDocuments.js';
import { InMemoryUploadedDocumentRepository } from '../../infrastructure/document/InMemoryUploadedDocumentRepository.js';
import { InMemorySessionRepository } from '../../infrastructure/session/InMemorySessionRepository.js';
import { LangGraphChatWorkflow } from '../../infrastructure/agent/LangGraphChatWorkflow.js';
import { DeterministicChatIntentClassifier } from '../../infrastructure/agent/DeterministicChatIntentClassifier.js';
import { DeterministicCommunityNoticeGenerator } from '../../infrastructure/communication/DeterministicCommunityNoticeGenerator.js';
import { DeterministicDocumentAnswerGenerator } from '../../infrastructure/document/DeterministicDocumentAnswerGenerator.js';
import { DeterministicIncidentClassifier } from '../../infrastructure/incident/DeterministicIncidentClassifier.js';
import { InMemoryIncidentRepository } from '../../infrastructure/incident/InMemoryIncidentRepository.js';
import { InMemoryMeetingRepository } from '../../infrastructure/meeting/InMemoryMeetingRepository.js';
import { InMemoryPendingAgreementRepository } from '../../infrastructure/meetingAgenda/InMemoryPendingAgreementRepository.js';
import { InMemoryProposalRepository } from '../../infrastructure/proposal/InMemoryProposalRepository.js';
import { createPostgresPool } from '../../infrastructure/database/createPostgresPool.js';
import { migrateDatabase } from '../../infrastructure/database/migrateDatabase.js';
import { createApiPersistence } from '../../infrastructure/persistence/createApiPersistence.js';
import { AiProviderError } from '../../application/ports/AiProviderError.js';
import { createApiApp } from './createApiApp.js';

const uploadedDocumentTextExtractor = {
  extractText: async () =>
    'El contrato de mantenimiento del ascensor del portal B vence el 30 de septiembre.',
};

function suggestedNoticeFor(description: string): string {
  return [
    'Estimados vecinos:',
    '',
    `Se ha registrado la siguiente incidencia: ${description}`,
    '',
    'La administración comunicará cualquier novedad relevante.',
  ].join('\n');
}

function buildApp(requestsLimit = 3, overrides: Partial<Parameters<typeof createApiApp>[0]> = {}) {
  return createApiApp(buildAppOptions(requestsLimit, overrides));
}

function buildAppOptions(
  requestsLimit = 3,
  overrides: Partial<Parameters<typeof createApiApp>[0]> = {},
): Parameters<typeof createApiApp>[0] {
  let idSequence = 0;
  const uploadedDocumentRepository =
    overrides.uploadedDocumentRepository ?? new InMemoryUploadedDocumentRepository();
  const documentRetriever =
    overrides.documentRetriever ??
    new LexicalDocumentRetriever(residencialSierraNevadaDocuments, uploadedDocumentRepository);

  return {
    clock: { now: () => new Date('2026-06-23T08:00:00.000Z') },
    chatWorkflowFactory: ({
      answerDocumentQuestion,
      chatIntentClassifier,
      createIncident,
      draftCommunityNotice,
      draftMeetingAgenda,
      draftMeetingMinutes,
    }) =>
      new LangGraphChatWorkflow({
        chatIntentClassifier,
        communityNoticeDrafter: draftCommunityNotice,
        documentAnswerer: answerDocumentQuestion,
        incidentCreator: createIncident,
        meetingAgendaDrafter: draftMeetingAgenda,
        meetingMinutesDrafter: draftMeetingMinutes,
      }),
    chatIntentClassifier: new DeterministicChatIntentClassifier(),
    communityNoticeGenerator: new DeterministicCommunityNoticeGenerator(),
    cookieSecret: 'test-secret',
    documentAnswerGenerator: new DeterministicDocumentAnswerGenerator(),
    documentRetriever,
    ids: { randomId: () => `00000000-0000-4000-8000-${String(++idSequence).padStart(12, '0')}` },
    incidentClassifier: new DeterministicIncidentClassifier(),
    incidentRepository: new InMemoryIncidentRepository(),
    meetingRepository: new InMemoryMeetingRepository(),
    pendingAgreementRepository: new InMemoryPendingAgreementRepository(),
    proposalRepository: new InMemoryProposalRepository(),
    repository: new InMemorySessionRepository(),
    requestsLimit,
    ttlMs: 60_000,
    uploadedDocumentRepository,
    uploadedDocumentTextExtractor,
    version: 'test',
    ...overrides,
  };
}

describe('createApiApp', () => {
  it('expone un healthcheck validado', async () => {
    const response = await request(buildApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'administrador-virtual-api',
      version: 'test',
    });
  });

  it('permite el preflight CORS para resolver incidencias', async () => {
    const response = await request(buildApp())
      .options('/api/incidents/inc-0001/resolve')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'PATCH');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-methods']).toContain('PATCH');
  });

  it('crea cookies firmadas y reutiliza la sesión del mismo navegador', async () => {
    const agent = request.agent(buildApp());
    const first = await agent.get('/api/session');
    const second = await agent.get('/api/session');

    expect(first.status).toBe(200);
    expect(first.headers['set-cookie']?.[0]).toContain('va_session=');
    expect(second.body.session.id).toBe(first.body.session.id);
    expect(second.body.session.requestsUsed).toBe(2);
  });

  it('recupera estado comunitario PostgreSQL tras reiniciar la persistencia', async () => {
    const container = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();
    const databaseUrl = container.getConnectionUri();
    await migrateDatabase(databaseUrl);
    let cookie: string[] | undefined;
    let sessionId: string | undefined;

    try {
      const firstPersistence = await createApiPersistence({ databaseUrl });
      try {
        const firstAgent = request.agent(
          buildApp(12, {
            incidentRepository: firstPersistence.incidentRepository,
            pendingAgreementRepository: firstPersistence.pendingAgreementRepository,
            proposalRepository: firstPersistence.proposalRepository,
            repository: firstPersistence.sessionRepository,
          }),
        );
        const session = await firstAgent.get('/api/session').expect(200);
        sessionId = session.body.session.id;
        await firstAgent.post('/api/incidents').send({
          description: 'Hay una fuga de agua urgente en el garaje.',
        });
        await firstAgent.post('/api/proposals').send({
          description: 'Instalar sensores de presencia en zonas comunes.',
        });
        const minutes = await firstAgent.post('/api/meeting-minutes/draft').send({
          notes: [
            'Junta ordinaria del 12 de junio.',
            'Tarea: Revisar contrato de limpieza; Responsable: Ana; Fecha: 30 de junio',
          ].join('\n'),
        });
        cookie = readSetCookie(minutes.headers['set-cookie']);
        expect(sessionId).toBeTypeOf('string');
        expect(cookie).toBeDefined();
      } finally {
        await firstPersistence.close();
      }

      const authenticatedCookie = cookie;
      const capturedSessionId = sessionId;
      expect(authenticatedCookie).toBeDefined();
      expect(capturedSessionId).toBeTypeOf('string');
      if (!authenticatedCookie || !capturedSessionId) {
        throw new Error('La prueba no capturó la cookie o la sesión PostgreSQL.');
      }

      const secondPersistence = await createApiPersistence({ databaseUrl });
      try {
        let secondIdSequence = 100;
        const secondApp = buildApp(12, {
          ids: {
            randomId: () =>
              `00000000-0000-4000-8000-${String(++secondIdSequence).padStart(12, '0')}`,
          },
          incidentRepository: secondPersistence.incidentRepository,
          pendingAgreementRepository: secondPersistence.pendingAgreementRepository,
          proposalRepository: secondPersistence.proposalRepository,
          repository: secondPersistence.sessionRepository,
        });
        const incidents = await request(secondApp)
          .get('/api/incidents')
          .set('Cookie', authenticatedCookie);
        const proposals = await request(secondApp)
          .get('/api/proposals')
          .set('Cookie', authenticatedCookie);
        const agenda = await request(secondApp)
          .post('/api/meeting-agendas/draft')
          .set('Cookie', authenticatedCookie)
          .send({ meetingId: 'meeting-ordinary-2026-09-18' });
        const isolated = await request(secondApp).get('/api/incidents');

        expect(incidents.body.incidents).toContainEqual(
          expect.objectContaining({
            description: 'Hay una fuga de agua urgente en el garaje.',
          }),
        );
        expect(proposals.body.proposals).toContainEqual(
          expect.objectContaining({
            description: 'Instalar sensores de presencia en zonas comunes.',
          }),
        );
        expect(agenda.body.draft.items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              description: 'Revisar contrato de limpieza',
              sourceType: 'pending-agreement',
            }),
            expect.objectContaining({
              description: 'Instalar sensores de presencia en zonas comunes.',
              sourceType: 'proposal',
            }),
          ]),
        );
        expect(isolated.body.incidents).not.toContainEqual(
          expect.objectContaining({
            description: 'Hay una fuga de agua urgente en el garaje.',
          }),
        );
      } finally {
        await secondPersistence.close();
      }

      const expiredPersistence = await createApiPersistence({ databaseUrl });
      try {
        let expiredIdSequence = 200;
        const expiredApp = buildApp(12, {
          clock: { now: () => new Date('2026-06-23T08:02:00.000Z') },
          ids: {
            randomId: () =>
              `00000000-0000-4000-8000-${String(++expiredIdSequence).padStart(12, '0')}`,
          },
          incidentRepository: expiredPersistence.incidentRepository,
          pendingAgreementRepository: expiredPersistence.pendingAgreementRepository,
          proposalRepository: expiredPersistence.proposalRepository,
          repository: expiredPersistence.sessionRepository,
        });
        const renewed = await request(expiredApp)
          .get('/api/incidents')
          .set('Cookie', authenticatedCookie);

        expect(renewed.body.incidents).not.toContainEqual(
          expect.objectContaining({
            description: 'Hay una fuga de agua urgente en el garaje.',
          }),
        );
        await expect(countCommunityRows(databaseUrl, capturedSessionId)).resolves.toBe(0);
      } finally {
        await expiredPersistence.close();
      }
    } finally {
      await container.stop();
    }
  }, 120_000);

  it('recupera PDFs subidos desde PostgreSQL tras reiniciar la persistencia', async () => {
    const container = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();
    const databaseUrl = container.getConnectionUri();
    await migrateDatabase(databaseUrl);
    const pdfContent = Buffer.from('%PDF-1.4 contrato ascensor');
    let cookie: string[] | undefined;
    let documentUrl: string | undefined;

    try {
      const firstPersistence = await createApiPersistence({ databaseUrl });
      try {
        const firstAgent = request.agent(
          buildApp(8, {
            incidentRepository: firstPersistence.incidentRepository,
            pendingAgreementRepository: firstPersistence.pendingAgreementRepository,
            proposalRepository: firstPersistence.proposalRepository,
            repository: firstPersistence.sessionRepository,
            uploadedDocumentRepository: firstPersistence.uploadedDocumentRepository,
          }),
        );
        const upload = await firstAgent
          .post('/api/documents/uploads')
          .attach('document', pdfContent, {
            filename: 'contrato-ascensor.pdf',
            contentType: 'application/pdf',
          });
        cookie = readSetCookie(upload.headers['set-cookie']);
        documentUrl = upload.body.document.documentUrl;

        expect(upload.status).toBe(201);
        expect(cookie).toBeDefined();
        expect(documentUrl).toBeTypeOf('string');
      } finally {
        await firstPersistence.close();
      }

      const authenticatedCookie = cookie;
      const capturedDocumentUrl = documentUrl;
      expect(authenticatedCookie).toBeDefined();
      expect(capturedDocumentUrl).toBeTypeOf('string');
      if (!authenticatedCookie || !capturedDocumentUrl) {
        throw new Error('La prueba no capturó la cookie o la URL del documento PostgreSQL.');
      }

      const secondPersistence = await createApiPersistence({ databaseUrl });
      try {
        let secondIdSequence = 300;
        const secondApp = buildApp(8, {
          ids: {
            randomId: () =>
              `00000000-0000-4000-8000-${String(++secondIdSequence).padStart(12, '0')}`,
          },
          incidentRepository: secondPersistence.incidentRepository,
          pendingAgreementRepository: secondPersistence.pendingAgreementRepository,
          proposalRepository: secondPersistence.proposalRepository,
          repository: secondPersistence.sessionRepository,
          uploadedDocumentRepository: secondPersistence.uploadedDocumentRepository,
        });
        const list = await request(secondApp)
          .get('/api/documents/uploads')
          .set('Cookie', authenticatedCookie);
        const download = await request(secondApp)
          .get(capturedDocumentUrl)
          .set('Cookie', authenticatedCookie);
        const query = await request(secondApp)
          .post('/api/documents/query')
          .set('Cookie', authenticatedCookie)
          .send({ question: '¿Cuándo vence el contrato del ascensor?' });
        const isolated = await request(secondApp).get('/api/documents/uploads');

        expect(list.body.documents).toEqual([
          expect.objectContaining({
            documentUrl: capturedDocumentUrl,
            filename: 'contrato-ascensor.pdf',
          }),
        ]);
        expect(download.status).toBe(200);
        expect(download.body).toEqual(pdfContent);
        expect(query.body.answer).toContain('contrato de mantenimiento');
        expect(query.body.sources[0]).toMatchObject({
          documentUrl: capturedDocumentUrl,
          title: 'contrato-ascensor',
          type: 'adjunto',
        });
        expect(isolated.body.documents).toEqual([]);
      } finally {
        await secondPersistence.close();
      }
    } finally {
      await container.stop();
    }
  }, 120_000);

  it('marca la cookie como segura cuando se configura para producción', async () => {
    const app = buildApp(3, {
      secureCookies: true,
    });

    const response = await request(app).get('/api/session');

    expect(response.headers['set-cookie']?.[0]).toContain('Secure');
  });

  it('mantiene aisladas dos sesiones sin cookie compartida', async () => {
    const app = buildApp();
    const first = await request(app).get('/api/session');
    const second = await request(app).get('/api/session');

    expect(first.body.session.id).not.toBe(second.body.session.id);
  });

  it('limita el uso de una sesión demo', async () => {
    const agent = request.agent(buildApp(1));
    await agent.get('/api/session').expect(200);
    const limited = await agent.get('/api/session');

    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('SESSION_LIMIT_REACHED');
  });

  it('responde consultas documentales con fuentes recuperadas', async () => {
    const agent = request.agent(buildApp());
    const response = await agent
      .post('/api/documents/query')
      .send({ question: '¿Cuál es el horario de la piscina?' });

    expect(response.status).toBe(200);
    expect(response.body.generationMode).toBe('deterministic-demo');
    expect(response.body.answer).toContain('piscina comunitaria');
    expect(response.body.sources[0]).toMatchObject({
      id: 'normas-piscina',
      section: 'Piscina',
      documentUrl: '/documents/normas-zonas-comunes.pdf',
    });
  });

  it('responde consultas documentales con modo semantico cuando el recuperador lo usa', async () => {
    const response = await request(
      buildApp(3, {
        documentRetriever: {
          mode: 'semantic-pgvector',
          retrieve: async () => [
            {
              content: 'La piscina comunitaria abre de 10:00 a 21:00.',
              documentUrl: '/documents/normas-zonas-comunes.pdf',
              id: 'normas-piscina',
              score: 0.93,
              section: 'Piscina',
              title: 'Normas de zonas comunes',
              type: 'normas',
            },
          ],
        },
      }),
    )
      .post('/api/documents/query')
      .send({ question: '¿Cuál es el horario de la piscina?' });

    expect(response.status).toBe(200);
    expect(response.body.generationMode).toBe('deterministic-demo');
    expect(response.body.mode).toBe('semantic-pgvector');
    expect(response.body.sources[0]).toMatchObject({
      documentUrl: '/documents/normas-zonas-comunes.pdf',
      id: 'normas-piscina',
    });
  });

  it('coordina mensajes libres de chat hacia el agente documental', async () => {
    const agent = request.agent(buildApp());
    const response = await agent
      .post('/api/chat/messages')
      .send({ message: '¿Qué dicen las normas sobre el horario de la piscina?' });

    expect(response.status).toBe(200);
    expect(response.body.agent).toBe('documentos');
    expect(response.body.mode).toBe('langgraph');
    expect(response.body.provider).toBe('deterministic-demo');
    expect(response.body.answer).toContain('piscina comunitaria');
    expect(response.body.sources[0]).toMatchObject({
      id: 'normas-piscina',
      documentUrl: '/documents/normas-zonas-comunes.pdf',
    });
  });

  it('coordina mensajes libres de chat hacia el agente de comunicados', async () => {
    const agent = request.agent(buildApp());
    const response = await agent
      .post('/api/chat/messages')
      .send({ message: 'Redacta un comunicado sobre la limpieza del garaje.' });

    expect(response.status).toBe(200);
    expect(response.body.agent).toBe('comunicados');
    expect(response.body.mode).toBe('langgraph');
    expect(response.body.provider).toBe('deterministic-demo');
    expect(response.body.answer).toContain('Asunto: Limpieza del garaje');
    expect(response.body.answer).toContain('Estimados vecinos:');
    expect(response.body.sources).toEqual([]);
  });

  it('coordina chat de actas y juntas usando pendientes de la misma sesión', async () => {
    const agent = request.agent(buildApp(6));
    const minutesResponse = await agent.post('/api/chat/messages').send({
      message: [
        'Junta ordinaria del 12 de junio.',
        'Tarea: Revisar contrato de limpieza; Responsable: Ana; Fecha: 30 de junio',
      ].join('\n'),
    });
    const agendaResponse = await agent.post('/api/chat/messages').send({
      message: 'Prepara el orden del día de la próxima junta.',
    });

    expect(minutesResponse.status).toBe(200);
    expect(minutesResponse.body.agent).toBe('actas');
    expect(agendaResponse.status).toBe(200);
    expect(agendaResponse.body).toMatchObject({
      agent: 'juntas',
      answer: expect.stringContaining('Revisar contrato de limpieza'),
      mode: 'langgraph',
      provider: 'deterministic-demo',
      sources: [],
    });
    expect(agendaResponse.body.answer).toContain('Responsable: Ana');
    expect(agendaResponse.body.answer).toContain('Fecha: 30 de junio');
  });

  it('redacta comunicados desde el endpoint dedicado', async () => {
    const agent = request.agent(buildApp());
    const response = await agent.post('/api/communications/draft').send({
      subject: 'Limpieza del garaje',
      type: 'informativo',
      audience: 'todos',
      tone: 'formal',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      draft: {
        subject: 'Limpieza del garaje',
        body: expect.stringContaining('Estimados vecinos:'),
      },
      mode: 'deterministic-demo',
    });
    expect(response.headers['set-cookie']?.[0]).toContain('va_session=');
  });

  it('redacta comunicados con el proveedor IA configurado', async () => {
    const receivedInputs: unknown[] = [];
    const agent = request.agent(
      buildApp(3, {
        communityNoticeGenerator: {
          draft: async (input) => {
            receivedInputs.push(input);

            return {
              draft: {
                subject: input.subject,
                body: 'Estimados vecinos:\n\nOpenAI ha preparado el aviso.',
              },
              mode: 'openai',
            };
          },
        },
      }),
    );

    const response = await agent.post('/api/communications/draft').send({
      subject: 'Corte de agua',
      type: 'urgente',
      audience: 'residentes',
      tone: 'directo',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      draft: {
        subject: 'Corte de agua',
        body: expect.stringContaining('OpenAI'),
      },
      mode: 'openai',
    });
    expect(receivedInputs).toEqual([
      {
        subject: 'Corte de agua',
        type: 'urgente',
        audience: 'residentes',
        tone: 'directo',
      },
    ]);
  });

  it('genera actas desde el endpoint dedicado', async () => {
    const agent = request.agent(buildApp());
    const response = await agent.post('/api/meeting-minutes/draft').send({
      notes: [
        'Junta ordinaria del 12 de junio.',
        'Acuerdo: aprobar presupuesto.',
        'Tarea: Revisar contrato; Responsable: Ana',
      ].join('\n'),
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      draft: {
        title: 'Acta de reunión',
        body: expect.stringContaining('Acuerdos:'),
        tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
      },
      mode: 'deterministic-demo',
    });
    expect(response.headers['set-cookie']?.[0]).toContain('va_session=');
  });

  it('lista las juntas demo seleccionables de la sesion', async () => {
    const agent = request.agent(buildApp());

    const response = await agent.get('/api/meetings');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      meetings: [
        {
          id: 'meeting-ordinary-2026-09-18',
          kind: 'ordinaria',
          title: 'Junta ordinaria',
          scheduledAt: '2026-09-18T17:00:00.000Z',
        },
        {
          id: 'meeting-extraordinary-2026-10-15',
          kind: 'extraordinaria',
          title: 'Junta extraordinaria',
          scheduledAt: '2026-10-15T17:00:00.000Z',
        },
      ],
    });
    expect(response.headers['set-cookie']?.[0]).toContain('va_session=');
  });

  it('genera un orden del día con incidencias y acuerdos pendientes de la sesión', async () => {
    const agent = request.agent(buildApp(6));
    await agent.post('/api/meeting-minutes/draft').send({
      notes: [
        'Junta ordinaria del 12 de junio.',
        'Tarea: Revisar contrato de limpieza; Responsable: Ana; Fecha: 30 de junio',
      ].join('\n'),
    });
    await agent.post('/api/incidents').send({
      description: 'Hay una fuga de agua urgente en el garaje.',
    });

    const response = await agent
      .post('/api/meeting-agendas/draft')
      .send({ meetingId: 'meeting-ordinary-2026-09-18' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      draft: {
        title: 'Orden del día · Junta ordinaria · 18 de septiembre de 2026',
        body: expect.stringContaining('fuga de agua urgente'),
        items: expect.arrayContaining([
          expect.objectContaining({
            sourceType: 'incident',
            priority: 'urgente',
          }),
          expect.objectContaining({
            description: 'Revisar contrato de limpieza',
            sourceType: 'pending-agreement',
            priority: 'alta',
            assignee: 'Ana',
            dueDate: '30 de junio',
          }),
        ]),
      },
      mode: 'deterministic-demo',
    });
    expect(response.body.draft.items).toHaveLength(8);
    expect(response.headers['set-cookie']?.[0]).toContain('va_session=');
  });

  it('genera un orden del día con los asuntos demo iniciales', async () => {
    const agent = request.agent(buildApp());

    const response = await agent
      .post('/api/meeting-agendas/draft')
      .send({ meetingId: 'meeting-ordinary-2026-09-18' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      draft: {
        title: 'Orden del día · Junta ordinaria · 18 de septiembre de 2026',
        body: expect.stringContaining('Fuga de agua urgente'),
        items: expect.arrayContaining([
          expect.objectContaining({
            sourceId: 'demo-fuga-agua-urgente',
            sourceType: 'incident',
          }),
          expect.objectContaining({
            sourceId: 'demo-acuerdo-ascensor',
            sourceType: 'pending-agreement',
          }),
        ]),
      },
      mode: 'deterministic-demo',
    });
    expect(response.body.draft.items).toHaveLength(6);
  });

  it('rechaza borradores de orden del dia sin junta seleccionada', async () => {
    const response = await request(buildApp()).post('/api/meeting-agendas/draft').send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('rechaza una junta inexistente para el borrador de orden del dia', async () => {
    const agent = request.agent(buildApp());

    const response = await agent
      .post('/api/meeting-agendas/draft')
      .send({ meetingId: 'meeting-missing' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('MEETING_NOT_FOUND');
  });

  it('crea incidencias clasificadas desde el endpoint dedicado', async () => {
    const agent = request.agent(buildApp());
    const response = await agent.post('/api/incidents').send({
      description: 'Hay una fuga de agua urgente en el garaje.',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      incident: {
        id: '00000000-0000-4000-8000-000000000002',
        description: 'Hay una fuga de agua urgente en el garaje.',
        type: 'agua',
        priority: 'urgente',
        suggestedResponsible: 'Fontanería',
        suggestedNotice: suggestedNoticeFor('Hay una fuga de agua urgente en el garaje.'),
        createdAt: '2026-06-23T08:00:00.000Z',
        status: 'pendiente',
        resolvedAt: null,
      },
      mode: 'deterministic-demo',
    });
    expect(response.headers['set-cookie']?.[0]).toContain('va_session=');
  });

  it('crea incidencias con el clasificador IA configurado', async () => {
    const agent = request.agent(
      buildApp(3, {
        incidentClassifier: {
          classify: async () => ({
            classification: {
              type: 'ascensor',
              priority: 'alta',
              suggestedResponsible: 'Mantenimiento de ascensores',
              suggestedNotice: suggestedNoticeFor(
                'El ascensor del portal B no funciona desde esta mañana.',
              ),
            },
            mode: 'openai',
          }),
        },
      }),
    );

    const response = await agent.post('/api/incidents').send({
      description: 'El ascensor del portal B no funciona desde esta mañana.',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      incident: {
        type: 'ascensor',
        priority: 'alta',
        suggestedResponsible: 'Mantenimiento de ascensores',
        suggestedNotice: suggestedNoticeFor(
          'El ascensor del portal B no funciona desde esta mañana.',
        ),
      },
      mode: 'openai',
    });
  });

  it('devuelve un error controlado cuando falla OpenAI', async () => {
    const response = await request(
      buildApp(3, {
        communityNoticeGenerator: {
          draft: async () => {
            throw new AiProviderError();
          },
        },
      }),
    )
      .post('/api/communications/draft')
      .send({
        subject: 'Corte de agua',
        type: 'informativo',
        audience: 'todos',
        tone: 'formal',
      });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('AI_PROVIDER_ERROR');
  });

  it('devuelve un error controlado cuando falla el generador documental IA', async () => {
    const response = await request(
      buildApp(3, {
        documentAnswerGenerator: {
          generate: async () => {
            throw new AiProviderError();
          },
        },
      }),
    )
      .post('/api/documents/query')
      .send({ question: '¿Cuál es el horario de la piscina?' });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('AI_PROVIDER_ERROR');
  });

  it('devuelve error controlado y no ejecuta agentes cuando falla el clasificador del chat', async () => {
    const agent = request.agent(
      buildApp(5, {
        chatIntentClassifier: {
          classify: async () => {
            throw new AiProviderError();
          },
        },
      }),
    );

    const response = await agent.post('/api/chat/messages').send({
      message: 'Hay una fuga de agua urgente en el garaje.',
    });
    const incidents = await agent.get('/api/incidents');

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('AI_PROVIDER_ERROR');
    expect(incidents.body.incidents).toHaveLength(4);
    expect(incidents.body.incidents).not.toContainEqual(
      expect.objectContaining({
        description: 'Hay una fuga de agua urgente en el garaje.',
      }),
    );
  });

  it('marca una incidencia como resuelta y conserva la resolución al repetir la operación', async () => {
    const agent = request.agent(buildApp(6));
    const created = await agent.post('/api/incidents').send({
      description: 'Hay una fuga de agua urgente en el garaje.',
    });

    const first = await agent.patch(`/api/incidents/${created.body.incident.id}/resolve`);
    const second = await agent.patch(`/api/incidents/${created.body.incident.id}/resolve`);

    expect(first.status).toBe(200);
    expect(first.body.incident).toMatchObject({
      id: created.body.incident.id,
      status: 'resuelta',
      resolvedAt: '2026-06-23T08:00:00.000Z',
      suggestedNotice: suggestedNoticeFor('Hay una fuga de agua urgente en el garaje.'),
    });
    expect(second.body.incident.resolvedAt).toBe(first.body.incident.resolvedAt);
    expect((await agent.get('/api/incidents')).body.incidents).toContainEqual(first.body.incident);
  });

  it('no permite resolver incidencias inexistentes en la sesión', async () => {
    const agent = request.agent(buildApp());
    const response = await agent.patch('/api/incidents/inc-missing/resolve');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('INCIDENT_NOT_FOUND');
  });

  it('valida el identificador de incidencia al resolver', async () => {
    const response = await request(buildApp()).patch('/api/incidents/%20/resolve');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('registra desde el chat una incidencia visible en el listado de la sesión', async () => {
    const agent = request.agent(buildApp());
    const chatResponse = await agent.post('/api/chat/messages').send({
      message: 'Hay una fuga de agua urgente en el garaje.',
    });
    const listResponse = await agent.get('/api/incidents');

    expect(chatResponse.status).toBe(200);
    expect(chatResponse.body).toMatchObject({
      agent: 'incidencias',
      answer: expect.stringContaining('Responsable sugerido: Fontanería'),
      mode: 'langgraph',
      provider: 'deterministic-demo',
      sources: [],
    });
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.incidents).toContainEqual(
      expect.objectContaining({
        description: 'Hay una fuga de agua urgente en el garaje.',
        type: 'agua',
        priority: 'urgente',
        suggestedResponsible: 'Fontanería',
        suggestedNotice: suggestedNoticeFor('Hay una fuga de agua urgente en el garaje.'),
      }),
    );
    expect(listResponse.body.incidents).toHaveLength(5);
  });

  it('lista incidencias de la sesión y permite filtrarlas por tipo', async () => {
    const agent = request.agent(buildApp(6));
    await agent.post('/api/incidents').send({
      description: 'Hay una fuga de agua en el garaje.',
    });
    await agent.post('/api/incidents').send({
      description: 'El ascensor no funciona desde esta mañana.',
    });

    const list = await agent.get('/api/incidents');
    const filtered = await agent.get('/api/incidents').query({ type: 'ascensor' });

    expect(list.status).toBe(200);
    expect(list.body.incidents).toHaveLength(6);
    expect(filtered.status).toBe(200);
    expect(filtered.body.incidents).toEqual([
      expect.objectContaining({
        id: 'demo-averia-ascensor',
        type: 'ascensor',
      }),
      expect.objectContaining({
        id: '00000000-0000-4000-8000-000000000003',
        type: 'ascensor',
        suggestedNotice: suggestedNoticeFor('El ascensor no funciona desde esta mañana.'),
      }),
    ]);
  });

  it('crea y lista propuestas vecinales de la sesion de mas reciente a mas antigua', async () => {
    let currentDate = new Date('2026-06-23T08:00:00.000Z');
    const agent = request.agent(
      buildApp(6, {
        clock: { now: () => currentDate },
      }),
    );
    const first = await agent.post('/api/proposals').send({
      description: 'Instalar aparcabicis en el patio interior.',
    });
    currentDate = new Date('2026-06-23T08:00:30.000Z');
    const second = await agent.post('/api/proposals').send({
      description: 'Crear una zona de compostaje comunitario.',
    });
    const list = await agent.get('/api/proposals');

    expect(first.status).toBe(201);
    expect(first.body).toEqual({
      proposal: {
        id: '00000000-0000-4000-8000-000000000002',
        description: 'Instalar aparcabicis en el patio interior.',
        createdAt: '2026-06-23T08:00:00.000Z',
      },
    });
    expect(second.status).toBe(201);
    expect(second.body.proposal.createdAt).toBe('2026-06-23T08:00:30.000Z');
    expect(list.status).toBe(200);
    expect(list.body.proposals).toEqual([second.body.proposal, first.body.proposal]);
    expect(list.headers['set-cookie']?.[0]).toContain('va_session=');
  });

  it('mantiene propuestas aisladas por sesion y permite duplicados', async () => {
    const app = buildApp(6);
    const firstAgent = request.agent(app);
    const secondAgent = request.agent(app);
    const first = await firstAgent.post('/api/proposals').send({
      description: 'Instalar aparcabicis en el patio interior.',
    });
    const duplicate = await firstAgent.post('/api/proposals').send({
      description: 'Instalar aparcabicis en el patio interior.',
    });
    await secondAgent.post('/api/proposals').send({
      description: 'Crear una zona de compostaje comunitario.',
    });

    const firstList = await firstAgent.get('/api/proposals');
    const secondList = await secondAgent.get('/api/proposals');

    expect(firstList.body.proposals).toEqual([first.body.proposal, duplicate.body.proposal]);
    expect(firstList.body.proposals[0].id).not.toBe(firstList.body.proposals[1].id);
    expect(secondList.body.proposals).toEqual([
      expect.objectContaining({
        description: 'Crear una zona de compostaje comunitario.',
      }),
    ]);
  });

  it('valida propuestas antes de consumir sesion', async () => {
    let consumeRequestCount = 0;
    const app = buildApp(3, {
      repository: {
        consumeRequest: async () => {
          consumeRequestCount += 1;
          return 'limit_reached';
        },
        findById: async () => undefined,
        save: async () => {
          /* no-op */
        },
      },
    });

    const shortDescription = await request(app)
      .post('/api/proposals')
      .send({ description: 'corta' });
    const unknownField = await request(app).post('/api/proposals').send({
      description: 'Instalar aparcabicis en el patio interior.',
      priority: 'alta',
    });

    expect(shortDescription.status).toBe(400);
    expect(shortDescription.body.error.code).toBe('VALIDATION_ERROR');
    expect(shortDescription.headers['set-cookie']).toBeUndefined();
    expect(unknownField.status).toBe(400);
    expect(unknownField.body.error.code).toBe('VALIDATION_ERROR');
    expect(unknownField.headers['set-cookie']).toBeUndefined();
    expect(consumeRequestCount).toBe(0);
  });

  it('valida el formato del endpoint de comunicados antes de consumir sesión', async () => {
    const response = await request(buildApp()).post('/api/communications/draft').send({
      subject: 'ok',
      type: 'informativo',
      audience: 'todos',
      tone: 'formal',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('valida el formato del endpoint de actas antes de consumir sesión', async () => {
    const response = await request(buildApp()).post('/api/meeting-minutes/draft').send({
      notes: 'Acta',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('valida el formato de incidencias antes de consumir sesión', async () => {
    let consumeRequestCount = 0;
    const app = buildApp(3, {
      repository: {
        consumeRequest: async () => {
          consumeRequestCount += 1;
          return 'limit_reached';
        },
        findById: async () => undefined,
        save: async () => {
          /* no-op */
        },
      },
    });

    const response = await request(app).post('/api/incidents').send({ description: 'Fuga' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(consumeRequestCount).toBe(0);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('consulta PDFs subidos como fuentes RAG de la sesión demo', async () => {
    const agent = request.agent(buildApp());
    await agent
      .post('/api/documents/uploads')
      .attach('document', Buffer.from('%PDF-1.4 contrato'), {
        filename: 'contrato-ascensor.pdf',
        contentType: 'application/pdf',
      });

    const response = await agent
      .post('/api/documents/query')
      .send({ question: '¿Cuándo vence el contrato del ascensor?' });

    expect(response.status).toBe(200);
    expect(response.body.answer).toContain('contrato de mantenimiento');
    expect(response.body.sources[0]).toMatchObject({
      title: 'contrato-ascensor',
      type: 'adjunto',
      documentUrl: expect.stringContaining('/api/documents/uploads/'),
    });
  });

  it('consulta PDFs subidos desde el chat documental de la sesión demo', async () => {
    const agent = request.agent(buildApp());
    await agent
      .post('/api/documents/uploads')
      .attach('document', Buffer.from('%PDF-1.4 contrato'), {
        filename: 'contrato-ascensor.pdf',
        contentType: 'application/pdf',
      });

    const response = await agent
      .post('/api/chat/messages')
      .send({ message: '¿Qué dice el contrato del ascensor?' });

    expect(response.status).toBe(200);
    expect(response.body.agent).toBe('documentos');
    expect(response.body.sources[0]).toMatchObject({
      title: 'contrato-ascensor',
      type: 'adjunto',
    });
  });

  it('valida el formato de mensajes de chat antes de consumir sesión', async () => {
    const response = await request(buildApp()).post('/api/chat/messages').send({ message: 'ok' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('sube y lista PDFs asociados a la sesión demo', async () => {
    const agent = request.agent(buildApp());
    const upload = await agent
      .post('/api/documents/uploads')
      .attach('document', Buffer.from('%PDF-1.4 contenido'), {
        filename: 'presupuesto ascensor.pdf',
        contentType: 'application/pdf',
      });
    const list = await agent.get('/api/documents/uploads');

    expect(upload.status).toBe(201);
    expect(upload.body.document).toMatchObject({
      filename: 'presupuesto ascensor.pdf',
      title: 'presupuesto ascensor',
      type: 'adjunto',
    });
    expect(list.status).toBe(200);
    expect(list.body.documents).toEqual([upload.body.document]);
  });

  it('descarga un PDF subido desde su URL dentro de la sesión demo', async () => {
    const agent = request.agent(buildApp());
    const pdfContent = Buffer.from('%PDF-1.4 presupuesto');
    const upload = await agent.post('/api/documents/uploads').attach('document', pdfContent, {
      filename: 'presupuesto ascensor.pdf',
      contentType: 'application/pdf',
    });

    const download = await agent.get(upload.body.document.documentUrl);

    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toContain('application/pdf');
    expect(download.headers['content-disposition']).toContain('presupuesto ascensor.pdf');
    expect(download.body).toEqual(pdfContent);
  });

  it('rechaza adjuntos que no son PDF', async () => {
    const response = await request(buildApp())
      .post('/api/documents/uploads')
      .attach('document', Buffer.from('texto'), {
        filename: 'notas.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_UPLOADED_DOCUMENT');
  });

  it('rechaza adjuntos PDF enviados en un campo inesperado', async () => {
    const response = await request(buildApp())
      .post('/api/documents/uploads')
      .attach('archivo', Buffer.from('%PDF-1.4 contenido'), {
        filename: 'presupuesto.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_UPLOADED_DOCUMENT');
  });

  it('rechaza subidas con más de un PDF en la misma petición', async () => {
    const response = await request(buildApp())
      .post('/api/documents/uploads')
      .attach('document', Buffer.from('%PDF-1.4 contenido'), {
        filename: 'presupuesto.pdf',
        contentType: 'application/pdf',
      })
      .attach('document', Buffer.from('%PDF-1.4 contenido'), {
        filename: 'factura.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_UPLOADED_DOCUMENT');
  });

  it('rechaza PDFs que superan 5 MB', async () => {
    const response = await request(buildApp())
      .post('/api/documents/uploads')
      .attach('document', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'demasiado-grande.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('UPLOAD_TOO_LARGE');
  });

  it('valida el formato de consultas documentales', async () => {
    const response = await request(buildApp()).post('/api/documents/query').send({ question: '' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('no crea sesión demo para consultas documentales con formato inválido', async () => {
    let consumeRequestCount = 0;
    const app = buildApp(3, {
      repository: {
        consumeRequest: async () => {
          consumeRequestCount += 1;
          return 'limit_reached';
        },
        findById: async () => undefined,
        save: async () => {
          /* no-op */
        },
      },
    });

    const response = await request(app).post('/api/documents/query').send({ question: '' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(consumeRequestCount).toBe(0);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('trata fallos del contrato de respuesta como errores internos', async () => {
    const app = buildApp(3, {
      documentRetriever: {
        mode: 'lexical-demo',
        retrieve: async () => [
          {
            id: 'documento-invalido',
            title: 'Documento inválido',
            type: 'normas',
            section: 'Sección',
            content: 'Contenido recuperado con enlace inválido.',
            documentUrl: '/documents/documento.txt',
            score: 0.9,
          },
        ],
      },
    });
    const response = await request(app)
      .post('/api/documents/query')
      .send({ question: 'documento inválido' });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('normaliza rutas no encontradas y errores inesperados', async () => {
    const notFound = await request(buildApp()).get('/api/desconocida');
    const failingApp = buildApp(3, {
      repository: {
        consumeRequest: async () => {
          throw new Error('database unavailable');
        },
        findById: async () => undefined,
        save: async (session: DemoSession) => {
          void session;
        },
      },
    });
    const failed = await request(failingApp).get('/api/session');

    expect(notFound.status).toBe(404);
    expect(notFound.body.error.code).toBe('NOT_FOUND');
    expect(failed.status).toBe(500);
    expect(failed.body.error.code).toBe('INTERNAL_ERROR');
  });
});

function readSetCookie(header: string | string[] | undefined): string[] | undefined {
  if (!header) return undefined;
  return Array.isArray(header) ? header : [header];
}

async function countCommunityRows(databaseUrl: string, sessionId: string): Promise<number> {
  const pool = createPostgresPool({ connectionString: databaseUrl, logIdleClientErrors: false });

  try {
    const result = await pool.query<{ total: string }>(
      `
        select
          (select count(*) from community_incidents where session_id = $1) +
          (select count(*) from pending_agreements where session_id = $1) +
          (select count(*) from community_proposals where session_id = $1) as total
      `,
      [sessionId],
    );

    return Number(result.rows[0]?.total ?? 0);
  } finally {
    await pool.end();
  }
}
