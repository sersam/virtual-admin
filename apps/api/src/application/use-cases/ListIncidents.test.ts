import { describe, expect, it } from 'vitest';
import { InMemoryIncidentRepository } from '../../infrastructure/incident/InMemoryIncidentRepository.js';
import { CreateIncident } from './CreateIncident.js';
import { ListIncidents } from './ListIncidents.js';

function suggestedNoticeFor(description: string): string {
  return [
    'Estimados vecinos:',
    '',
    `Se ha registrado la siguiente incidencia: ${description}`,
    '',
    'La administración comunicará cualquier novedad relevante.',
  ].join('\n');
}

describe('ListIncidents', () => {
  it('lista únicamente incidencias de la sesión indicada', async () => {
    const repository = new InMemoryIncidentRepository();
    await repository.save({
      id: 'inc-0001',
      sessionId: 'session-a',
      description: 'Hay una fuga de agua en el garaje.',
      type: 'agua',
      priority: 'alta',
      suggestedResponsible: 'Fontanería',
      suggestedNotice: suggestedNoticeFor('Hay una fuga de agua en el garaje.'),
      createdAt: new Date('2026-06-27T10:00:00.000Z'),
      status: 'pendiente',
      resolvedAt: null,
    });
    await repository.save({
      id: 'inc-0002',
      sessionId: 'session-b',
      description: 'El ascensor no funciona.',
      type: 'ascensor',
      priority: 'alta',
      suggestedResponsible: 'Mantenimiento de ascensores',
      suggestedNotice: suggestedNoticeFor('El ascensor no funciona.'),
      createdAt: new Date('2026-06-27T10:05:00.000Z'),
      status: 'pendiente',
      resolvedAt: null,
    });

    const useCase = new ListIncidents({ repository });

    await expect(useCase.execute({ sessionId: 'session-a' })).resolves.toEqual([
      expect.objectContaining({ id: 'inc-0001', type: 'agua' }),
    ]);
  });

  it('filtra incidencias por tipo dentro de la sesión', async () => {
    const repository = new InMemoryIncidentRepository();
    let nextId = 0;
    const createIncident = new CreateIncident({
      classifier: {
        classify: async (description) => ({
          classification: description.includes('ascensor')
            ? {
                type: 'ascensor',
                priority: 'alta',
                suggestedResponsible: 'Mantenimiento de ascensores',
                suggestedNotice: suggestedNoticeFor(description),
              }
            : {
                type: 'agua',
                priority: 'alta',
                suggestedResponsible: 'Fontanería',
                suggestedNotice: suggestedNoticeFor(description),
              },
          mode: 'deterministic-demo',
        }),
      },
      clock: { now: () => new Date('2026-06-27T10:00:00.000Z') },
      ids: {
        randomId: () => {
          nextId += 1;
          return `inc-${String(nextId).padStart(4, '0')}`;
        },
      },
      repository,
    });
    await createIncident.execute({
      sessionId: 'session-a',
      description: 'Hay una fuga de agua en el garaje.',
    });
    await createIncident.execute({
      sessionId: 'session-a',
      description: 'El ascensor no funciona desde esta mañana.',
    });

    const useCase = new ListIncidents({ repository });

    await expect(useCase.execute({ sessionId: 'session-a', type: 'ascensor' })).resolves.toEqual([
      expect.objectContaining({ id: 'inc-0002', type: 'ascensor' }),
    ]);
  });
});
