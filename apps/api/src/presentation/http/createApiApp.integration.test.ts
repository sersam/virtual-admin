import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { DemoSession } from '../../domain/session/DemoSession.js';
import { LexicalDocumentRetriever } from '../../infrastructure/document/LexicalDocumentRetriever.js';
import { residencialSierraNevadaDocuments } from '../../infrastructure/document/residencialSierraNevadaDocuments.js';
import { InMemoryUploadedDocumentRepository } from '../../infrastructure/document/InMemoryUploadedDocumentRepository.js';
import { InMemorySessionRepository } from '../../infrastructure/session/InMemorySessionRepository.js';
import { createApiApp } from './createApiApp.js';

const documentRetriever = new LexicalDocumentRetriever(residencialSierraNevadaDocuments);
const uploadedDocumentTextExtractor = {
  extractText: async () =>
    'El contrato de mantenimiento del ascensor del portal B vence el 30 de septiembre.',
};

function buildApp(requestsLimit = 3) {
  let idSequence = 0;
  return createApiApp({
    clock: { now: () => new Date('2026-06-23T08:00:00.000Z') },
    cookieSecret: 'test-secret',
    documentRetriever,
    ids: { randomId: () => `00000000-0000-4000-8000-${String(++idSequence).padStart(12, '0')}` },
    repository: new InMemorySessionRepository(),
    requestsLimit,
    ttlMs: 60_000,
    uploadedDocumentRepository: new InMemoryUploadedDocumentRepository(),
    uploadedDocumentTextExtractor,
    version: 'test',
  });
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

  it('crea cookies firmadas y reutiliza la sesión del mismo navegador', async () => {
    const agent = request.agent(buildApp());
    const first = await agent.get('/api/session');
    const second = await agent.get('/api/session');

    expect(first.status).toBe(200);
    expect(first.headers['set-cookie']?.[0]).toContain('va_session=');
    expect(second.body.session.id).toBe(first.body.session.id);
    expect(second.body.session.requestsUsed).toBe(2);
  });

  it('marca la cookie como segura cuando se configura para producción', async () => {
    let idSequence = 0;
    const app = createApiApp({
      clock: { now: () => new Date('2026-06-23T08:00:00.000Z') },
      cookieSecret: 'test-secret',
      documentRetriever,
      ids: { randomId: () => `00000000-0000-4000-8000-${String(++idSequence).padStart(12, '0')}` },
      repository: new InMemorySessionRepository(),
      requestsLimit: 3,
      secureCookies: true,
      ttlMs: 60_000,
      uploadedDocumentRepository: new InMemoryUploadedDocumentRepository(),
      uploadedDocumentTextExtractor,
      version: 'test',
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
    expect(response.body.answer).toContain('piscina comunitaria');
    expect(response.body.sources[0]).toMatchObject({
      id: 'normas-piscina',
      section: 'Piscina',
      documentUrl: '/documents/normas-zonas-comunes.pdf',
    });
  });

  it('coordina mensajes libres de chat hacia el agente documental', async () => {
    const agent = request.agent(buildApp());
    const response = await agent
      .post('/api/chat/messages')
      .send({ message: '¿Qué dicen las normas sobre el horario de la piscina?' });

    expect(response.status).toBe(200);
    expect(response.body.agent).toBe('documentos');
    expect(response.body.mode).toBe('langgraph-demo');
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
    expect(response.body.mode).toBe('langgraph-demo');
    expect(response.body.answer).toContain('Asunto: Limpieza del garaje');
    expect(response.body.answer).toContain('Estimados vecinos:');
    expect(response.body.sources).toEqual([]);
  });

  it('redacta comunicados desde el endpoint dedicado', async () => {
    const agent = request.agent(buildApp());
    const response = await agent
      .post('/api/communications/draft')
      .send({ message: 'Redacta un comunicado sobre la limpieza del garaje.' });

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

  it('valida el formato del endpoint de comunicados antes de consumir sesión', async () => {
    const response = await request(buildApp()).post('/api/communications/draft').send({
      message: 'ok',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
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
    const app = createApiApp({
      clock: { now: () => new Date('2026-06-23T08:00:00.000Z') },
      cookieSecret: 'test-secret',
      documentRetriever,
      ids: { randomId: () => '00000000-0000-4000-8000-000000000001' },
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
      requestsLimit: 3,
      ttlMs: 60_000,
      uploadedDocumentRepository: new InMemoryUploadedDocumentRepository(),
      uploadedDocumentTextExtractor,
      version: 'test',
    });

    const response = await request(app).post('/api/documents/query').send({ question: '' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(consumeRequestCount).toBe(0);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('trata fallos del contrato de respuesta como errores internos', async () => {
    const app = createApiApp({
      clock: { now: () => new Date('2026-06-23T08:00:00.000Z') },
      cookieSecret: 'test-secret',
      documentRetriever: {
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
      ids: { randomId: () => '00000000-0000-4000-8000-000000000001' },
      repository: new InMemorySessionRepository(),
      requestsLimit: 3,
      ttlMs: 60_000,
      uploadedDocumentRepository: new InMemoryUploadedDocumentRepository(),
      uploadedDocumentTextExtractor,
      version: 'test',
    });
    const response = await request(app)
      .post('/api/documents/query')
      .send({ question: 'documento inválido' });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('normaliza rutas no encontradas y errores inesperados', async () => {
    const notFound = await request(buildApp()).get('/api/desconocida');
    const failingApp = createApiApp({
      clock: { now: () => new Date('2026-06-23T08:00:00.000Z') },
      cookieSecret: 'test-secret',
      documentRetriever,
      ids: { randomId: () => '00000000-0000-4000-8000-000000000001' },
      repository: {
        consumeRequest: async () => {
          throw new Error('database unavailable');
        },
        findById: async () => undefined,
        save: async (session: DemoSession) => {
          void session;
        },
      },
      requestsLimit: 3,
      ttlMs: 60_000,
      uploadedDocumentRepository: new InMemoryUploadedDocumentRepository(),
      uploadedDocumentTextExtractor,
      version: 'test',
    });
    const failed = await request(failingApp).get('/api/session');

    expect(notFound.status).toBe(404);
    expect(notFound.body.error.code).toBe('NOT_FOUND');
    expect(failed.status).toBe(500);
    expect(failed.body.error.code).toBe('INTERNAL_ERROR');
  });
});
