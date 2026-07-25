import { describe, expect, it } from 'vitest';
import { InMemoryMeetingRepository } from './InMemoryMeetingRepository.js';

describe('InMemoryMeetingRepository', () => {
  it('lista las dos juntas demo por sesion en orden cronologico', async () => {
    const repository = new InMemoryMeetingRepository();

    await expect(repository.listBySession('session-a')).resolves.toEqual([
      expect.objectContaining({
        id: 'meeting-ordinary-2026-09-18',
        sessionId: 'session-a',
        kind: 'ordinaria',
      }),
      expect.objectContaining({
        id: 'meeting-extraordinary-2026-10-15',
        sessionId: 'session-a',
        kind: 'extraordinaria',
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
    await expect(repository.findBySession('session-a', 'meeting-missing')).resolves.toBeUndefined();
  });
});
