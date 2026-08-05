import { afterEach, describe, expect, it, vi } from 'vitest';
import { listMeetings } from './listMeetings';

describe('listMeetings api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista juntas demo y valida la respuesta', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(validMeetingsResponse());

    const response = await listMeetings();

    expect(response.meetings).toHaveLength(2);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/meetings',
      expect.objectContaining({
        credentials: 'include',
        method: 'GET',
      }),
    );
  });

  it('rechaza respuestas HTTP no exitosas', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }));

    await expect(listMeetings()).rejects.toThrow('No se pudieron cargar las juntas (HTTP 503).');
  });

  it('rechaza respuestas exitosas que no cumplen el contrato', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ meetings: [{ id: '' }] }), { status: 200 }),
    );

    await expect(listMeetings()).rejects.toThrow();
  });
});

function validMeetingsResponse(): Response {
  return new Response(
    JSON.stringify({
      meetings: [
        {
          id: 'meeting-ordinary-2026-09-18',
          kind: 'ordinaria',
          title: 'Junta ordinaria',
          scheduledAt: '2026-09-18T17:00:00.000Z',
          reviewPeriod: {
            startsAt: '2026-04-30T08:30:00.000Z',
            endsAt: '2026-07-29T08:30:00.000Z',
          },
        },
        {
          id: 'meeting-extraordinary-2026-10-15',
          kind: 'extraordinaria',
          title: 'Junta extraordinaria',
          scheduledAt: '2026-10-15T17:00:00.000Z',
          reviewPeriod: {
            startsAt: '2026-06-29T08:30:00.000Z',
            endsAt: '2026-07-29T08:30:00.000Z',
          },
        },
      ],
    }),
    { status: 200 },
  );
}
