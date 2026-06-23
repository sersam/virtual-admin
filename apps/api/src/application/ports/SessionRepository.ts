import type { DemoSession } from '../../domain/session/DemoSession.js';

export interface SessionRepository {
  findById(id: string): Promise<DemoSession | undefined>;
  save(session: DemoSession): Promise<void>;
}
