import type { DemoSession } from '../../domain/session/DemoSession.js';

export function presentSession(session: DemoSession) {
  return {
    id: session.id,
    createdAt: session.createdAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    requestsUsed: session.requestsUsed,
    requestsLimit: session.requestsLimit,
  };
}
