export interface DemoSession {
  readonly id: string;
  readonly createdAt: Date;
  readonly lastSeenAt: Date;
  readonly expiresAt: Date;
  readonly requestsUsed: number;
  readonly requestsLimit: number;
}

export interface CreateSessionInput {
  readonly id: string;
  readonly now: Date;
  readonly ttlMs: number;
  readonly requestsLimit: number;
}

export function createDemoSession(input: CreateSessionInput): DemoSession {
  if (input.ttlMs <= 0) throw new Error('La duración de sesión debe ser positiva.');
  if (input.requestsLimit <= 0) throw new Error('El límite de uso debe ser positivo.');

  return {
    id: input.id,
    createdAt: input.now,
    lastSeenAt: input.now,
    expiresAt: new Date(input.now.getTime() + input.ttlMs),
    requestsUsed: 0,
    requestsLimit: input.requestsLimit,
  };
}

export function touchDemoSession(session: DemoSession, now: Date): DemoSession {
  return {
    ...session,
    lastSeenAt: now,
    requestsUsed: session.requestsUsed + 1,
  };
}

export function sessionIsExpired(session: DemoSession, now: Date): boolean {
  return session.expiresAt.getTime() <= now.getTime();
}

export function sessionHasReachedLimit(session: DemoSession): boolean {
  return session.requestsUsed >= session.requestsLimit;
}
