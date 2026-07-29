import { describe, expect, it } from 'vitest';
import { InMemoryMeetingRepository } from './InMemoryMeetingRepository.js';

describe('InMemoryMeetingRepository', () => {
  it('lista las dos juntas demo por sesion en orden cronologico', async () => {
    const repository = new InMemoryMeetingRepository({
      now: () => new Date('2026-07-29T08:30:00.000Z'),
    });

    await expect(repository.listBySession('session-a')).resolves.toEqual([
      expect.objectContaining({
        id: 'meeting-ordinary-2026-09-18',
        sessionId: 'session-a',
        kind: 'ordinaria',
        scheduledAt: new Date('2026-08-29T17:00:00.000Z'),
      }),
      expect.objectContaining({
        id: 'meeting-extraordinary-2026-10-15',
        sessionId: 'session-a',
        kind: 'extraordinaria',
        scheduledAt: new Date('2026-09-29T17:00:00.000Z'),
      }),
    ]);
  });

  it('ajusta fin de mes al ultimo dia disponible del mes futuro', async () => {
    const repository = new InMemoryMeetingRepository({
      now: () => new Date('2026-01-31T08:30:00.000Z'),
    });

    await expect(repository.listBySession('session-a')).resolves.toEqual([
      expect.objectContaining({
        scheduledAt: new Date('2026-02-28T17:00:00.000Z'),
      }),
      expect.objectContaining({
        scheduledAt: new Date('2026-03-31T17:00:00.000Z'),
      }),
    ]);
  });

  it('encuentra juntas dentro de la sesion solicitada', async () => {
    const repository = new InMemoryMeetingRepository();

    await expect(
      repository.findBySession('session-a', 'meeting-ordinary-2026-09-18'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'meeting-ordinary-2026-09-18',
        sessionId: 'session-a',
      }),
    );
    await expect(
      repository.findBySession('session-b', 'meeting-ordinary-2026-09-18'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'meeting-ordinary-2026-09-18',
        sessionId: 'session-b',
      }),
    );
    await expect(repository.findBySession('session-a', 'meeting-missing')).resolves.toBeUndefined();
  });
});
