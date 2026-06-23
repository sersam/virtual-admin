import type { DemoSession } from '../../domain/session/DemoSession.js';

export type ConsumeSessionResult = DemoSession | 'limit_reached';

export interface ConsumeSessionInput {
  readonly sessionId?: string;
  readonly now: Date;
  readonly ttlMs: number;
  readonly requestsLimit: number;
  readonly createSessionId: () => string;
}

export interface SessionRepository {
  consumeRequest(input: ConsumeSessionInput): Promise<ConsumeSessionResult>;
  findById(id: string): Promise<DemoSession | undefined>;
  save(session: DemoSession): Promise<void>;
}
