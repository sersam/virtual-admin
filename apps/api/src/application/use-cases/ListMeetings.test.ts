import { describe, expect, it } from 'vitest';
import { ListMeetings } from './ListMeetings.js';

describe('ListMeetings', () => {
  it('devuelve juntas ordenadas para la sesion', async () => {
    const useCase = new ListMeetings({
      meetingRepository: {
        listBySession: async () => [
          {
            id: 'meeting-ordinary-2026-09-18',
            sessionId: 'session-a',
            kind: 'ordinaria',
            title: 'Junta ordinaria',
            scheduledAt: new Date('2026-09-18T17:00:00.000Z'),
          },
        ],
        findBySession: async () => undefined,
      },
    });

    await expect(useCase.execute({ sessionId: 'session-a' })).resolves.toEqual({
      meetings: [
        {
          id: 'meeting-ordinary-2026-09-18',
          kind: 'ordinaria',
          title: 'Junta ordinaria',
          scheduledAt: '2026-09-18T17:00:00.000Z',
        },
      ],
    });
  });
});
