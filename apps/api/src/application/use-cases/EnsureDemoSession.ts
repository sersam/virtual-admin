import type { DemoSession } from '../../domain/session/DemoSession.js';
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
    const consumed = await this.dependencies.repository.consumeRequest({
      sessionId,
      now: this.dependencies.clock.now(),
      ttlMs: this.dependencies.ttlMs,
      requestsLimit: this.dependencies.requestsLimit,
      createSessionId: () => this.dependencies.ids.randomId(),
    });

    if (consumed === 'limit_reached') throw new SessionUsageLimitReachedError();

    return consumed;
  }
}
