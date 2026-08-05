import { describe, expect, it } from 'vitest';
import { MeetingListResponseSchema, MeetingSchema } from './meetings.js';

describe('meeting contracts', () => {
  const validMeeting = {
    id: 'meeting-ordinary-2026-09-18',
    kind: 'ordinaria',
    title: 'Junta ordinaria',
    scheduledAt: '2026-09-18T17:00:00.000Z',
    reviewPeriod: {
      startsAt: '2026-04-30T08:30:00.000Z',
      endsAt: '2026-07-29T08:30:00.000Z',
    },
  };

  it('valida juntas demo seleccionables', () => {
    expect(MeetingSchema.parse(validMeeting)).toEqual(validMeeting);
  });

  it('rechaza juntas con campos inválidos o fuera de límites', () => {
    expect(() => MeetingSchema.parse({ ...validMeeting, kind: 'informativa' })).toThrow();
    expect(() => MeetingSchema.parse({ ...validMeeting, scheduledAt: '18/09/2026' })).toThrow();
    expect(() => MeetingSchema.parse({ ...validMeeting, id: '' })).toThrow();
    expect(() => MeetingSchema.parse({ ...validMeeting, title: '   ' })).toThrow();
    expect(() => MeetingSchema.parse({ ...validMeeting, id: 'a'.repeat(81) })).toThrow();
    expect(() => MeetingSchema.parse({ ...validMeeting, title: 'a'.repeat(121) })).toThrow();
  });

  it('rechaza periodos de revision no ISO o invertidos', () => {
    expect(() =>
      MeetingSchema.parse({
        ...validMeeting,
        reviewPeriod: { startsAt: '30/04/2026', endsAt: '2026-07-29T08:30:00.000Z' },
      }),
    ).toThrow();
    expect(() =>
      MeetingSchema.parse({
        ...validMeeting,
        reviewPeriod: {
          startsAt: '2026-07-29T08:30:00.001Z',
          endsAt: '2026-07-29T08:30:00.000Z',
        },
      }),
    ).toThrow();
  });

  it('valida el listado de juntas', () => {
    const response = MeetingListResponseSchema.parse({
      meetings: [validMeeting],
    });

    expect(response.meetings).toHaveLength(1);
  });

  it('rechaza listados con una junta inválida', () => {
    expect(() =>
      MeetingListResponseSchema.parse({
        meetings: [validMeeting, { ...validMeeting, id: '' }],
      }),
    ).toThrow();
  });
});
