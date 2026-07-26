import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import multer from 'multer';
import {
  ChatMessageRequestSchema,
  ChatMessageResponseSchema,
  CommunityNoticeDraftRequestSchema,
  CommunityNoticeDraftResponseSchema,
  CreateIncidentRequestSchema,
  CreateIncidentResponseSchema,
  DocumentQueryRequestSchema,
  DocumentQueryResponseSchema,
  ErrorResponseSchema,
  HealthResponseSchema,
  IncidentListQuerySchema,
  IncidentListResponseSchema,
  MeetingListResponseSchema,
  MeetingAgendaDraftRequestSchema,
  MeetingAgendaDraftResponseSchema,
  ResolveIncidentParamsSchema,
  ResolveIncidentResponseSchema,
  MeetingMinutesDraftRequestSchema,
  MeetingMinutesDraftResponseSchema,
  PdfUploadConstraints,
  SessionResponseSchema,
  UploadedDocumentResponseSchema,
  UploadedDocumentsResponseSchema,
} from '@admin/contracts';
import {
  EnsureDemoSession,
  SessionUsageLimitReachedError,
} from '../../application/use-cases/EnsureDemoSession.js';
import { AnswerDocumentQuestion } from '../../application/use-cases/AnswerDocumentQuestion.js';
import { CoordinateChatMessage } from '../../application/use-cases/CoordinateChatMessage.js';
import {
  CreateIncident,
  InvalidIncidentDescriptionError,
} from '../../application/use-cases/CreateIncident.js';
import { DraftCommunityNotice } from '../../application/use-cases/DraftCommunityNotice.js';
import {
  DraftMeetingAgenda,
  MeetingNotFoundError,
} from '../../application/use-cases/DraftMeetingAgenda.js';
import { DraftMeetingMinutes } from '../../application/use-cases/DraftMeetingMinutes.js';
import {
  GetUploadedDocument,
  UploadedDocumentNotFoundError,
} from '../../application/use-cases/GetUploadedDocument.js';
import { InitializeDemoSessionData } from '../../application/use-cases/InitializeDemoSessionData.js';
import { ListUploadedDocuments } from '../../application/use-cases/ListUploadedDocuments.js';
import {
  InvalidUploadedDocumentError,
  StoreUploadedDocument,
  UploadedDocumentTooLargeError,
} from '../../application/use-cases/StoreUploadedDocument.js';
import { ListIncidents } from '../../application/use-cases/ListIncidents.js';
import { ListMeetings } from '../../application/use-cases/ListMeetings.js';
import {
  IncidentNotFoundError,
  ResolveIncident,
} from '../../application/use-cases/ResolveIncident.js';
import type { DocumentRetriever } from '../../application/ports/DocumentRetriever.js';
import type { SessionRepository } from '../../application/ports/SessionRepository.js';
import type { UploadedDocumentRepository } from '../../application/ports/UploadedDocumentRepository.js';
import type { UploadedDocumentTextExtractor } from '../../application/ports/UploadedDocumentTextExtractor.js';
import type { Clock } from '../../application/ports/Clock.js';
import type { IdGenerator } from '../../application/ports/IdGenerator.js';
import type { ChatWorkflow } from '../../application/ports/ChatWorkflow.js';
import type { CommunityNoticeGenerator } from '../../application/ports/CommunityNoticeGenerator.js';
import type { IncidentClassifier } from '../../application/ports/IncidentClassifier.js';
import type { IncidentRepository } from '../../application/ports/IncidentRepository.js';
import type { MeetingRepository } from '../../application/ports/MeetingRepository.js';
import type { PendingAgreementRepository } from '../../application/ports/PendingAgreementRepository.js';
import type { SessionDocumentRetriever } from '../../application/ports/SessionDocumentRetriever.js';
import { AiProviderError } from '../../application/ports/AiProviderError.js';
import { presentIncident } from './incidentPresenter.js';
import { presentSession } from './sessionPresenter.js';

const SESSION_COOKIE = 'va_session';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const uploadPdf = multer({
  limits: { fileSize: PdfUploadConstraints.maxSizeBytes },
  storage: multer.memoryStorage(),
});

interface ApiAppOptions {
  readonly clock: Clock;
  readonly chatWorkflowFactory: (dependencies: {
    readonly answerDocumentQuestion: AnswerDocumentQuestion;
    readonly createIncident: CreateIncident;
    readonly draftCommunityNotice: DraftCommunityNotice;
    readonly draftMeetingAgenda: DraftMeetingAgenda;
    readonly draftMeetingMinutes: DraftMeetingMinutes;
  }) => ChatWorkflow;
  readonly cookieSecret: string;
  readonly communityNoticeGenerator: CommunityNoticeGenerator;
  readonly documentRetriever: DocumentRetriever;
  readonly ids: IdGenerator;
  readonly incidentClassifier: IncidentClassifier;
  readonly incidentRepository: IncidentRepository;
  readonly meetingRepository: MeetingRepository;
  readonly pendingAgreementRepository: PendingAgreementRepository;
  readonly repository: SessionRepository;
  readonly requestsLimit?: number;
  readonly secureCookies?: boolean;
  readonly sessionDocumentRetriever?: SessionDocumentRetriever;
  readonly ttlMs?: number;
  readonly uploadedDocumentRepository: UploadedDocumentRepository;
  readonly uploadedDocumentTextExtractor: UploadedDocumentTextExtractor;
  readonly version: string;
}

export function createApiApp(options: ApiAppOptions) {
  const app = express();
  const answerDocumentQuestion = new AnswerDocumentQuestion({
    retriever: options.documentRetriever,
    sessionRetriever: options.sessionDocumentRetriever,
  });
  const createIncident = new CreateIncident({
    classifier: options.incidentClassifier,
    clock: options.clock,
    ids: options.ids,
    repository: options.incidentRepository,
  });
  const listIncidents = new ListIncidents({ repository: options.incidentRepository });
  const draftMeetingAgenda = new DraftMeetingAgenda({
    incidentRepository: options.incidentRepository,
    meetingRepository: options.meetingRepository,
    pendingAgreementRepository: options.pendingAgreementRepository,
  });
  const listMeetings = new ListMeetings({ meetingRepository: options.meetingRepository });
  const draftCommunityNotice = new DraftCommunityNotice({
    generator: options.communityNoticeGenerator,
  });
  const draftMeetingMinutes = new DraftMeetingMinutes({
    clock: options.clock,
    ids: options.ids,
    pendingAgreementRepository: options.pendingAgreementRepository,
  });
  const resolveIncident = new ResolveIncident({
    clock: options.clock,
    repository: options.incidentRepository,
  });
  const coordinateChatMessage = new CoordinateChatMessage({
    workflow: options.chatWorkflowFactory({
      answerDocumentQuestion,
      createIncident,
      draftCommunityNotice,
      draftMeetingAgenda,
      draftMeetingMinutes,
    }),
  });
  const ensureSession = new EnsureDemoSession({
    clock: options.clock,
    demoDataInitializer: new InitializeDemoSessionData({
      incidentRepository: options.incidentRepository,
      pendingAgreementRepository: options.pendingAgreementRepository,
    }),
    ids: options.ids,
    repository: options.repository,
    requestsLimit: options.requestsLimit ?? 120,
    ttlMs: options.ttlMs ?? ONE_DAY_MS,
  });
  const storeUploadedDocument = new StoreUploadedDocument({
    clock: options.clock,
    ids: options.ids,
    repository: options.uploadedDocumentRepository,
    textExtractor: options.uploadedDocumentTextExtractor,
  });
  const listUploadedDocuments = new ListUploadedDocuments({
    repository: options.uploadedDocumentRepository,
  });
  const getUploadedDocument = new GetUploadedDocument({
    repository: options.uploadedDocumentRepository,
  });

  app.disable('x-powered-by');
  app.use(
    cors({
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      origin: true,
    }),
  );
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser(options.cookieSecret));

  app.get('/health', (_request: Request, response: Response) => {
    response.json(
      HealthResponseSchema.parse({
        status: 'ok',
        service: 'administrador-virtual-api',
        version: options.version,
      }),
    );
  });

  app.get('/api/session', async (request: Request, response: Response, next) => {
    try {
      const session = await ensureSession.execute(readSignedSessionId(request));
      attachSessionCookie(response, session.id, options);
      response.json(SessionResponseSchema.parse({ session: presentSession(session), mode: 'api' }));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/documents/query', async (request: Request, response: Response, next) => {
    try {
      const payloadResult = DocumentQueryRequestSchema.safeParse(request.body);
      if (!payloadResult.success) {
        sendError(response, 400, 'VALIDATION_ERROR', 'La petición no tiene un formato válido.');
        return;
      }

      const session = await ensureSession.execute(readSignedSessionId(request));
      const answer = await answerDocumentQuestion.execute(payloadResult.data.question, {
        sessionId: session.id,
      });

      attachSessionCookie(response, session.id, options);
      response.json(DocumentQueryResponseSchema.parse(answer));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/chat/messages', async (request: Request, response: Response, next) => {
    try {
      const payloadResult = ChatMessageRequestSchema.safeParse(request.body);
      if (!payloadResult.success) {
        sendError(response, 400, 'VALIDATION_ERROR', 'La petición no tiene un formato válido.');
        return;
      }

      const session = await ensureSession.execute(readSignedSessionId(request));
      const answer = await coordinateChatMessage.execute(payloadResult.data.message, {
        sessionId: session.id,
      });

      attachSessionCookie(response, session.id, options);
      response.json(ChatMessageResponseSchema.parse(answer));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/communications/draft', async (request: Request, response: Response, next) => {
    try {
      const payloadResult = CommunityNoticeDraftRequestSchema.safeParse(request.body);
      if (!payloadResult.success) {
        sendError(response, 400, 'VALIDATION_ERROR', 'La petición no tiene un formato válido.');
        return;
      }

      const session = await ensureSession.execute(readSignedSessionId(request));
      const draft = await draftCommunityNotice.execute(payloadResult.data);

      attachSessionCookie(response, session.id, options);
      response.json(CommunityNoticeDraftResponseSchema.parse(draft));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/meeting-minutes/draft', async (request: Request, response: Response, next) => {
    try {
      const payloadResult = MeetingMinutesDraftRequestSchema.safeParse(request.body);
      if (!payloadResult.success) {
        sendError(response, 400, 'VALIDATION_ERROR', 'La petición no tiene un formato válido.');
        return;
      }

      const session = await ensureSession.execute(readSignedSessionId(request));
      const draft = await draftMeetingMinutes.execute(payloadResult.data.notes, {
        sessionId: session.id,
      });

      attachSessionCookie(response, session.id, options);
      response.json(MeetingMinutesDraftResponseSchema.parse(draft));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/meeting-agendas/draft', async (request: Request, response: Response, next) => {
    try {
      const payloadResult = MeetingAgendaDraftRequestSchema.safeParse(request.body);
      if (!payloadResult.success) {
        sendError(response, 400, 'VALIDATION_ERROR', 'La petición no tiene un formato válido.');
        return;
      }

      const session = await ensureSession.execute(readSignedSessionId(request));
      const draft = await draftMeetingAgenda.execute({
        sessionId: session.id,
        meetingId: payloadResult.data.meetingId,
      });

      attachSessionCookie(response, session.id, options);
      response.json(MeetingAgendaDraftResponseSchema.parse(draft));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/meetings', async (request: Request, response: Response, next) => {
    try {
      const session = await ensureSession.execute(readSignedSessionId(request));
      const meetings = await listMeetings.execute({ sessionId: session.id });

      attachSessionCookie(response, session.id, options);
      response.json(MeetingListResponseSchema.parse(meetings));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/incidents', async (request: Request, response: Response, next) => {
    try {
      const payloadResult = CreateIncidentRequestSchema.safeParse(request.body);
      if (!payloadResult.success) {
        sendError(response, 400, 'VALIDATION_ERROR', 'La petición no tiene un formato válido.');
        return;
      }

      const session = await ensureSession.execute(readSignedSessionId(request));
      const incident = await createIncident.execute({
        sessionId: session.id,
        description: payloadResult.data.description,
      });

      attachSessionCookie(response, session.id, options);
      response.status(201).json(
        CreateIncidentResponseSchema.parse({
          incident: presentIncident(incident.incident),
          mode: incident.mode,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/incidents', async (request: Request, response: Response, next) => {
    try {
      const queryResult = IncidentListQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        sendError(response, 400, 'VALIDATION_ERROR', 'La petición no tiene un formato válido.');
        return;
      }

      const session = await ensureSession.execute(readSignedSessionId(request));
      const incidents = await listIncidents.execute({
        sessionId: session.id,
        type: queryResult.data.type,
      });

      attachSessionCookie(response, session.id, options);
      response.json(
        IncidentListResponseSchema.parse({
          incidents: incidents.map(presentIncident),
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  app.patch(
    '/api/incidents/:incidentId/resolve',
    async (request: Request, response: Response, next) => {
      try {
        const paramsResult = ResolveIncidentParamsSchema.safeParse(request.params);
        if (!paramsResult.success) {
          sendError(response, 400, 'VALIDATION_ERROR', 'La petición no tiene un formato válido.');
          return;
        }

        const session = await ensureSession.execute(readSignedSessionId(request));
        const incident = await resolveIncident.execute({
          incidentId: paramsResult.data.incidentId,
          sessionId: session.id,
        });

        attachSessionCookie(response, session.id, options);
        response.json(ResolveIncidentResponseSchema.parse({ incident: presentIncident(incident) }));
      } catch (error) {
        next(error);
      }
    },
  );

  app.get('/api/documents/uploads', async (request: Request, response: Response, next) => {
    try {
      const session = await ensureSession.execute(readSignedSessionId(request));
      const documents = await listUploadedDocuments.execute(session.id);

      attachSessionCookie(response, session.id, options);
      response.json(UploadedDocumentsResponseSchema.parse({ documents }));
    } catch (error) {
      next(error);
    }
  });

  app.post(
    '/api/documents/uploads',
    uploadPdf.single('document'),
    async (request: Request, response: Response, next) => {
      try {
        if (!request.file) {
          sendError(response, 400, 'INVALID_UPLOADED_DOCUMENT', 'Debes adjuntar un archivo PDF.');
          return;
        }

        const session = await ensureSession.execute(readSignedSessionId(request));
        const document = await storeUploadedDocument.execute({
          sessionId: session.id,
          filename: request.file.originalname,
          contentType: request.file.mimetype,
          sizeBytes: request.file.size,
          content: request.file.buffer,
        });

        attachSessionCookie(response, session.id, options);
        response.status(201).json(UploadedDocumentResponseSchema.parse({ document }));
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    '/api/documents/uploads/:documentId/:filename',
    async (request: Request, response: Response, next) => {
      try {
        const session = await ensureSession.execute(readSignedSessionId(request));
        const { documentId } = request.params;
        if (typeof documentId !== 'string') {
          sendError(
            response,
            404,
            'UPLOADED_DOCUMENT_NOT_FOUND',
            'No se ha encontrado el PDF adjunto.',
          );
          return;
        }

        const document = await getUploadedDocument.execute({
          sessionId: session.id,
          documentId,
        });

        attachSessionCookie(response, session.id, options);
        response.attachment(document.filename);
        response.type(PdfUploadConstraints.mimeType);
        response.send(Buffer.from(document.content));
      } catch (error) {
        next(error);
      }
    },
  );

  app.use((_request: Request, response: Response) => {
    sendError(response, 404, 'NOT_FOUND', 'Ruta no encontrada.');
  });

  app.use(errorHandler);

  return app;
}

function readSignedSessionId(request: Request): string | undefined {
  const value = request.signedCookies[SESSION_COOKIE];
  return typeof value === 'string' ? value : undefined;
}

function attachSessionCookie(response: Response, sessionId: string, options: ApiAppOptions): void {
  response.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    maxAge: options.ttlMs ?? ONE_DAY_MS,
    sameSite: 'lax',
    secure: options.secureCookies ?? false,
    signed: true,
  });
}

const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof SessionUsageLimitReachedError) {
    sendError(
      response,
      429,
      'SESSION_LIMIT_REACHED',
      'Has alcanzado el límite de uso de esta sesión demo.',
    );
    return;
  }

  if (error instanceof InvalidUploadedDocumentError) {
    sendError(response, 400, 'INVALID_UPLOADED_DOCUMENT', 'El archivo adjunto debe ser un PDF.');
    return;
  }

  if (error instanceof UploadedDocumentNotFoundError) {
    sendError(response, 404, 'UPLOADED_DOCUMENT_NOT_FOUND', 'No se ha encontrado el PDF adjunto.');
    return;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      sendError(response, 413, 'UPLOAD_TOO_LARGE', 'El PDF no puede superar 5 MB.');
      return;
    }

    sendError(
      response,
      400,
      'INVALID_UPLOADED_DOCUMENT',
      'Debes adjuntar un único archivo PDF en el campo "document".',
    );
    return;
  }

  if (error instanceof UploadedDocumentTooLargeError) {
    sendError(response, 413, 'UPLOAD_TOO_LARGE', 'El PDF no puede superar 5 MB.');
    return;
  }

  if (error instanceof InvalidIncidentDescriptionError) {
    sendError(response, 400, 'VALIDATION_ERROR', error.message);
    return;
  }

  if (error instanceof IncidentNotFoundError) {
    sendError(response, 404, 'INCIDENT_NOT_FOUND', error.message);
    return;
  }

  if (error instanceof MeetingNotFoundError) {
    sendError(response, 404, 'MEETING_NOT_FOUND', error.message);
    return;
  }

  if (error instanceof AiProviderError) {
    console.error('openai.error', sanitizeOpenAiError(error.cause));
    sendError(response, 502, 'AI_PROVIDER_ERROR', 'No se pudo completar la operación con OpenAI.');
    return;
  }

  sendError(response, 500, 'INTERNAL_ERROR', 'No se pudo procesar la petición.');
};

function sendError(response: Response, status: number, code: string, message: string): void {
  response.status(status).json(ErrorResponseSchema.parse({ error: { code, message } }));
}

function sanitizeOpenAiError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { message: String(error) };

  const candidate = error as Error & {
    readonly code?: unknown;
    readonly requestID?: unknown;
    readonly status?: unknown;
    readonly type?: unknown;
  };

  return {
    code: candidate.code,
    message: candidate.message,
    name: candidate.name,
    requestID: candidate.requestID,
    status: candidate.status,
    type: candidate.type,
  };
}
