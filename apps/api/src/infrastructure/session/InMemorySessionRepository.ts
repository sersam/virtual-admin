import type {
  ConsumeSessionInput,
  ConsumeSessionResult,
  SessionRepository,
} from '../../application/ports/SessionRepository.js';
import {
  createDemoSession,
  sessionHasReachedLimit,
  sessionIsExpired,
  touchDemoSession,
  type DemoSession,
} from '../../domain/session/DemoSession.js';

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, DemoSession>();

  async consumeRequest(input: ConsumeSessionInput): Promise<ConsumeSessionResult> {
    const session = this.findReusableSession(input) ?? this.createSession(input);

    if (sessionHasReachedLimit(session)) return 'limit_reached';

    const touched = touchDemoSession(session, input.now);
    this.sessions.set(touched.id, touched);
    return touched;
  }

  async findById(id: string): Promise<DemoSession | undefined> {
    return this.sessions.get(id);
  }

  async save(session: DemoSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  private findReusableSession(input: ConsumeSessionInput): DemoSession | undefined {
    if (!input.sessionId) return undefined;

    const session = this.sessions.get(input.sessionId);
    if (!session) return undefined;

    if (sessionIsExpired(session, input.now)) {
      this.sessions.delete(input.sessionId);
      return undefined;
    }

    return session;
  }

  private createSession(input: ConsumeSessionInput): DemoSession {
    return createDemoSession({
      id: input.createSessionId(),
      now: input.now,
      ttlMs: input.ttlMs,
      requestsLimit: input.requestsLimit,
    });
  }
}
