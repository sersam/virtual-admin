import { describe, expect, it } from 'vitest';
import { InMemoryIncidentRepository } from '../../infrastructure/incident/InMemoryIncidentRepository.js';
import { IncidentNotFoundError, ResolveIncident } from './ResolveIncident.js';

const createdAt = new Date('2026-06-27T10:00:00.000Z');
const firstResolution = new Date('2026-06-27T12:30:00.000Z');
const suggestedNotice = [
  'Estimados vecinos:',
  '',
  'Se ha registrado la siguiente incidencia: Hay una fuga de agua en el garaje.',
  '',
  'La administración comunicará cualquier novedad relevante.',
].join('\n');

async function savePendingIncident(repository: InMemoryIncidentRepository): Promise<void> {
  await repository.save({
    id: 'inc-0001',
    sessionId: 'session-a',
    description: 'Hay una fuga de agua en el garaje.',
    type: 'agua',
    priority: 'alta',
    suggestedResponsible: 'Fontanería',
    suggestedNotice,
    createdAt,
    status: 'pendiente',
    resolvedAt: null,
  });
}

describe('ResolveIncident', () => {
  it('marca como resuelta una incidencia de la sesión', async () => {
    const repository = new InMemoryIncidentRepository();
    await savePendingIncident(repository);
    const useCase = new ResolveIncident({
      clock: { now: () => firstResolution },
      repository,
    });

    await expect(
      useCase.execute({ incidentId: 'inc-0001', sessionId: 'session-a' }),
    ).resolves.toEqual({
      id: 'inc-0001',
      sessionId: 'session-a',
      description: 'Hay una fuga de agua en el garaje.',
      type: 'agua',
      priority: 'alta',
      suggestedResponsible: 'Fontanería',
      suggestedNotice,
      createdAt,
      status: 'resuelta',
      resolvedAt: firstResolution,
    });
  });

  it('conserva la fecha original cuando se resuelve de nuevo', async () => {
    const repository = new InMemoryIncidentRepository();
    await savePendingIncident(repository);
    const firstUseCase = new ResolveIncident({ clock: { now: () => firstResolution }, repository });
    await firstUseCase.execute({ incidentId: 'inc-0001', sessionId: 'session-a' });
    const secondUseCase = new ResolveIncident({
      clock: { now: () => new Date('2026-06-28T09:00:00.000Z') },
      repository,
    });

    const incident = await secondUseCase.execute({
      incidentId: 'inc-0001',
      sessionId: 'session-a',
    });

    expect(incident.resolvedAt).toBe(firstResolution);
  });

  it('rechaza incidencias inexistentes o pertenecientes a otra sesión', async () => {
    const repository = new InMemoryIncidentRepository();
    await savePendingIncident(repository);
    const useCase = new ResolveIncident({
      clock: { now: () => firstResolution },
      repository,
    });

    await expect(
      useCase.execute({ incidentId: 'inc-0001', sessionId: 'session-b' }),
    ).rejects.toBeInstanceOf(IncidentNotFoundError);
    await expect(
      useCase.execute({ incidentId: 'inc-missing', sessionId: 'session-a' }),
    ).rejects.toBeInstanceOf(IncidentNotFoundError);
  });
});
