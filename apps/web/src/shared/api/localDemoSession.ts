import type { SessionResponse } from '@admin/contracts';

const LOCAL_DEMO_SESSION_ID = '49fa210a-1189-4f4f-8d7a-8f832f3c1ec1';
const LOCAL_DEMO_CREATED_AT = '2026-06-23T08:00:00.000Z';

export function createLocalDemoSession(): SessionResponse {
  return {
    mode: 'local-demo',
    session: {
      id: LOCAL_DEMO_SESSION_ID,
      createdAt: LOCAL_DEMO_CREATED_AT,
      lastSeenAt: LOCAL_DEMO_CREATED_AT,
      expiresAt: '2026-06-24T08:00:00.000Z',
      requestsUsed: 0,
      requestsLimit: 120,
    },
  };
}
