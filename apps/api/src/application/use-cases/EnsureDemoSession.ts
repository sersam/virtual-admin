import {
  createDemoSession,
  sessionHasReachedLimit,
  sessionIsExpired,
  touchDemoSession,
  type DemoSession,
} from '../../domain/session/DemoSession.js';
import type { Clock } from '../ports/Clock.js';
import type { IdGenerator } from '../ports/IdGenerator.js';
import type { SessionRepository } from '../ports/SessionRepository.js';

export class SessionUsageLimitReachedError extends Error {
  constructor() {
    super('La sesión ha superado el límite de uso de la demo.');
  }
}

interface EnsureDemoSessionDependencies {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly repository: SessionRepository;
  readonly requestsLimit: number;
  readonly ttlMs: number;
}

export class EnsureDemoSession {
  constructor(private readonly dependencies: EnsureDemoSessionDependencies) {}

  async execute(sessionId?: string): Promise<DemoSession> {
    const now = this.dependencies.clock.now();
    const existingSession = sessionId
      ? await this.dependencies.repository.findById(sessionId)
      : undefined;
    const session = this.reusableSession(existingSession, now) ?? this.createSession(now);

    if (sessionHasReachedLimit(session)) throw new SessionUsageLimitReachedError();

    const touched = touchDemoSession(session, now);
    await this.dependencies.repository.save(touched);
    return touched;
  }

  private reusableSession(session: DemoSession | undefined, now: Date): DemoSession | undefined {
    if (!session) return undefined;
    return sessionIsExpired(session, now) ? undefined : session;
  }

  private createSession(now: Date): DemoSession {
    return createDemoSession({
      id: this.dependencies.ids.randomId(),
      now,
      ttlMs: this.dependencies.ttlMs,
      requestsLimit: this.dependencies.requestsLimit,
    });
  }
}
