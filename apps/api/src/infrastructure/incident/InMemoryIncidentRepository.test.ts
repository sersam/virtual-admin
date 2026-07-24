import { describe, expect, it } from 'vitest';
import { InMemoryIncidentRepository } from './InMemoryIncidentRepository.js';

describe('InMemoryIncidentRepository', () => {
  it('mantiene aisladas las incidencias por sesión y permite filtrar por tipo', async () => {
    const repository = new InMemoryIncidentRepository();
    await repository.save({
      id: 'inc-0001',
      sessionId: 'session-a',
      description: 'Hay una fuga de agua en el garaje.',
      type: 'agua',
      priority: 'alta',
      suggestedResponsible: 'Fontanería',
      createdAt: new Date('2026-06-27T10:00:00.000Z'),
      status: 'pendiente',
      resolvedAt: null,
    });
    await repository.save({
      id: 'inc-0002',
      sessionId: 'session-a',
      description: 'El ascensor no funciona.',
      type: 'ascensor',
      priority: 'alta',
      suggestedResponsible: 'Mantenimiento de ascensores',
      createdAt: new Date('2026-06-27T10:05:00.000Z'),
      status: 'pendiente',
      resolvedAt: null,
    });

    await expect(repository.listBySession('session-a', { type: 'agua' })).resolves.toEqual([
      expect.objectContaining({ id: 'inc-0001', type: 'agua' }),
    ]);
    await expect(repository.listBySession('session-b')).resolves.toEqual([]);
  });

  it('resuelve solo la incidencia indicada dentro de su sesión', async () => {
    const repository = new InMemoryIncidentRepository();
    await repository.save({
      id: 'inc-0001',
      sessionId: 'session-a',
      description: 'Hay una fuga de agua en el garaje.',
      type: 'agua',
      priority: 'alta',
      suggestedResponsible: 'Fontanería',
      createdAt: new Date('2026-06-27T10:00:00.000Z'),
      status: 'pendiente',
      resolvedAt: null,
    });

    const resolvedAt = new Date('2026-06-27T12:30:00.000Z');

    await expect(repository.resolve('session-a', 'inc-0001', resolvedAt)).resolves.toMatchObject({
      id: 'inc-0001',
      status: 'resuelta',
      resolvedAt,
    });
    await expect(repository.resolve('session-b', 'inc-0001', resolvedAt)).resolves.toBeUndefined();
  });
});
