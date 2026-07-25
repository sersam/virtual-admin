import { describe, expect, it } from 'vitest';
import { MeetingListResponseSchema, MeetingSchema } from './meetings.js';

describe('meeting contracts', () => {
  it('valida juntas demo seleccionables', () => {
    expect(
      MeetingSchema.parse({
        id: 'meeting-ordinary-2026-09-18',
        kind: 'ordinaria',
        title: 'Junta ordinaria',
        scheduledAt: '2026-09-18T17:00:00.000Z',
      }),
    ).toEqual({
      id: 'meeting-ordinary-2026-09-18',
      kind: 'ordinaria',
      title: 'Junta ordinaria',
      scheduledAt: '2026-09-18T17:00:00.000Z',
    });
  });

  it('valida el listado de juntas', () => {
    const response = MeetingListResponseSchema.parse({
      meetings: [
        {
          id: 'meeting-ordinary-2026-09-18',
          kind: 'ordinaria',
          title: 'Junta ordinaria',
          scheduledAt: '2026-09-18T17:00:00.000Z',
        },
      ],
    });

    expect(response.meetings).toHaveLength(1);
  });
});
