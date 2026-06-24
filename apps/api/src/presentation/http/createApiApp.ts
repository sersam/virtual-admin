import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import multer from 'multer';
import {
  ChatMessageRequestSchema,
  ChatMessageResponseSchema,
  DocumentQueryRequestSchema,
  DocumentQueryResponseSchema,
  ErrorResponseSchema,
  HealthResponseSchema,
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
  GetUploadedDocument,
  UploadedDocumentNotFoundError,
} from '../../application/use-cases/GetUploadedDocument.js';
import { ListUploadedDocuments } from '../../application/use-cases/ListUploadedDocuments.js';
import {
  InvalidUploadedDocumentError,
  StoreUploadedDocument,
  UploadedDocumentTooLargeError,
} from '../../application/use-cases/StoreUploadedDocument.js';
import type { DocumentRetriever } from '../../application/ports/DocumentRetriever.js';
import type { SessionRepository } from '../../application/ports/SessionRepository.js';
import type { UploadedDocumentRepository } from '../../application/ports/UploadedDocumentRepository.js';
import type { UploadedDocumentTextExtractor } from '../../application/ports/UploadedDocumentTextExtractor.js';
import type { Clock } from '../../application/ports/Clock.js';
import type { IdGenerator } from '../../application/ports/IdGenerator.js';
import { LangGraphChatWorkflow } from '../../infrastructure/agent/LangGraphChatWorkflow.js';
import { UploadedSessionDocumentRetriever } from '../../infrastructure/document/UploadedSessionDocumentRetriever.js';
import { presentSession } from './sessionPresenter.js';

const SESSION_COOKIE = 'va_session';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const uploadPdf = multer({
  limits: { fileSize: PdfUploadConstraints.maxSizeBytes },
  storage: multer.memoryStorage(),
});

interface ApiAppOptions {
  readonly clock: Clock;
  readonly cookieSecret: string;
  readonly documentRetriever: DocumentRetriever;
  readonly ids: IdGenerator;
  readonly repository: SessionRepository;
  readonly requestsLimit?: number;
  readonly secureCookies?: boolean;
  readonly ttlMs?: number;
  readonly uploadedDocumentRepository: UploadedDocumentRepository;
  readonly uploadedDocumentTextExtractor: UploadedDocumentTextExtractor;
  readonly version: string;
}

export function createApiApp(options: ApiAppOptions) {
  const app = express();
  const uploadedSessionDocumentRetriever = new UploadedSessionDocumentRetriever(
    options.uploadedDocumentRepository,
  );
  const answerDocumentQuestion = new AnswerDocumentQuestion({
    retriever: options.documentRetriever,
    sessionRetriever: uploadedSessionDocumentRetriever,
  });
  const coordinateChatMessage = new CoordinateChatMessage({
    workflow: new LangGraphChatWorkflow({
      documentAnswerer: answerDocumentQuestion,
    }),
  });
  const ensureSession = new EnsureDemoSession({
    clock: options.clock,
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
  app.use(cors({ origin: true, credentials: true }));
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

  if (
    error instanceof UploadedDocumentTooLargeError ||
    (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE')
  ) {
    sendError(response, 413, 'UPLOAD_TOO_LARGE', 'El PDF no puede superar 5 MB.');
    return;
  }

  sendError(response, 500, 'INTERNAL_ERROR', 'No se pudo procesar la petición.');
};

function sendError(response: Response, status: number, code: string, message: string): void {
  response.status(status).json(ErrorResponseSchema.parse({ error: { code, message } }));
}
