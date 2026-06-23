import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import { ErrorResponseSchema, HealthResponseSchema, SessionResponseSchema } from '@admin/contracts';
import {
  EnsureDemoSession,
  SessionUsageLimitReachedError,
} from '../../application/use-cases/EnsureDemoSession.js';
import type { SessionRepository } from '../../application/ports/SessionRepository.js';
import type { Clock } from '../../application/ports/Clock.js';
import type { IdGenerator } from '../../application/ports/IdGenerator.js';
import { presentSession } from './sessionPresenter.js';

const SESSION_COOKIE = 'va_session';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface ApiAppOptions {
  readonly clock: Clock;
  readonly cookieSecret: string;
  readonly ids: IdGenerator;
  readonly repository: SessionRepository;
  readonly requestsLimit?: number;
  readonly secureCookies?: boolean;
  readonly ttlMs?: number;
  readonly version: string;
}

export function createApiApp(options: ApiAppOptions) {
  const app = express();
  const ensureSession = new EnsureDemoSession({
    clock: options.clock,
    ids: options.ids,
    repository: options.repository,
    requestsLimit: options.requestsLimit ?? 120,
    ttlMs: options.ttlMs ?? ONE_DAY_MS,
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
      response.cookie(SESSION_COOKIE, session.id, {
        httpOnly: true,
        maxAge: options.ttlMs ?? ONE_DAY_MS,
        sameSite: 'lax',
        secure: options.secureCookies ?? false,
        signed: true,
      });
      response.json(SessionResponseSchema.parse({ session: presentSession(session), mode: 'api' }));
    } catch (error) {
      next(error);
    }
  });

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

  sendError(response, 500, 'INTERNAL_ERROR', 'No se pudo procesar la petición.');
};

function sendError(response: Response, status: number, code: string, message: string): void {
  response.status(status).json(ErrorResponseSchema.parse({ error: { code, message } }));
}
