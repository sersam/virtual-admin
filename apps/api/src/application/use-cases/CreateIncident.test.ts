import { describe, expect, it } from 'vitest';
import { InMemoryIncidentRepository } from '../../infrastructure/incident/InMemoryIncidentRepository.js';
import { CreateIncident } from './CreateIncident.js';

describe('CreateIncident', () => {
  it('clasifica y guarda una incidencia asociada a la sesión', async () => {
    const repository = new InMemoryIncidentRepository();
    const useCase = new CreateIncident({
      classifier: {
        classify: () => ({
          type: 'agua',
          priority: 'urgente',
          suggestedResponsible: 'Fontanería',
        }),
      },
      clock: { now: () => new Date('2026-06-27T10:00:00.000Z') },
      ids: { randomId: () => 'inc-0001' },
      repository,
    });

    const incident = await useCase.execute({
      sessionId: 'session-a',
      description: '  Hay una fuga de agua urgente en el garaje.  ',
    });

    expect(incident).toEqual({
      id: 'inc-0001',
      description: 'Hay una fuga de agua urgente en el garaje.',
      type: 'agua',
      priority: 'urgente',
      suggestedResponsible: 'Fontanería',
      createdAt: '2026-06-27T10:00:00.000Z',
      status: 'pendiente',
      resolvedAt: null,
    });
    await expect(repository.listBySession('session-a')).resolves.toEqual([
      expect.objectContaining({
        id: 'inc-0001',
        sessionId: 'session-a',
        createdAt: new Date('2026-06-27T10:00:00.000Z'),
      }),
    ]);
  });

  it('rechaza descripciones demasiado cortas', async () => {
    const useCase = new CreateIncident({
      classifier: {
        classify: () => ({
          type: 'otro',
          priority: 'media',
          suggestedResponsible: 'Administrador',
        }),
      },
      clock: { now: () => new Date('2026-06-27T10:00:00.000Z') },
      ids: { randomId: () => 'inc-0001' },
      repository: new InMemoryIncidentRepository(),
    });

    await expect(
      useCase.execute({
        sessionId: 'session-a',
        description: 'Fuga',
      }),
    ).rejects.toThrow('La descripción de la incidencia debe tener al menos 10 caracteres.');
  });

  it('acepta descripciones con el mínimo exacto de 10 caracteres', async () => {
    const repository = new InMemoryIncidentRepository();
    const useCase = new CreateIncident({
      classifier: {
        classify: () => ({
          type: 'otro',
          priority: 'media',
          suggestedResponsible: 'Administrador',
        }),
      },
      clock: { now: () => new Date('2026-06-27T10:00:00.000Z') },
      ids: { randomId: () => 'inc-0002' },
      repository,
    });

    const incident = await useCase.execute({
      sessionId: 'session-a',
      description: '1234567890',
    });

    expect(incident.description).toBe('1234567890');
    await expect(repository.listBySession('session-a')).resolves.toEqual([
      expect.objectContaining({
        id: 'inc-0002',
        description: '1234567890',
        sessionId: 'session-a',
      }),
    ]);
  });
});
