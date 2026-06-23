import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import { HealthResponseSchema, SessionResponseSchema } from '@admin/contracts';
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
        secure: false,
        signed: true,
      });
      response.json(SessionResponseSchema.parse({ session: presentSession(session), mode: 'api' }));
    } catch (error) {
      next(error);
    }
  });

  app.use((_request: Request, response: Response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' } });
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
    response.status(429).json({
      error: {
        code: 'SESSION_LIMIT_REACHED',
        message: 'Has alcanzado el límite de uso de esta sesión demo.',
      },
    });
    return;
  }

  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'No se pudo procesar la petición.',
    },
  });
};
