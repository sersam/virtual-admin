import type { SessionRepository } from '../../application/ports/SessionRepository.js';
import type { DemoSession } from '../../domain/session/DemoSession.js';

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, DemoSession>();

  async findById(id: string): Promise<DemoSession | undefined> {
    return this.sessions.get(id);
  }

  async save(session: DemoSession): Promise<void> {
    this.sessions.set(session.id, session);
  }
}
