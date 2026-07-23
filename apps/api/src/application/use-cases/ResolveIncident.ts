import type { Incident } from '@admin/contracts';
import type { Clock } from '../ports/Clock.js';
import type { IncidentRepository } from '../ports/IncidentRepository.js';
import { presentIncident } from './CreateIncident.js';

interface ResolveIncidentDependencies {
  readonly clock: Clock;
  readonly repository: IncidentRepository;
}

interface ResolveIncidentInput {
  readonly incidentId: string;
  readonly sessionId: string;
}

export class IncidentNotFoundError extends Error {
  constructor() {
    super('No se encontró la incidencia en la sesión actual.');
  }
}

export class ResolveIncident {
  constructor(private readonly dependencies: ResolveIncidentDependencies) {}

  async execute(input: ResolveIncidentInput): Promise<Incident> {
    const incident = await this.dependencies.repository.resolve(
      input.sessionId,
      input.incidentId,
      this.dependencies.clock.now(),
    );
    if (!incident) throw new IncidentNotFoundError();

    return presentIncident(incident);
  }
}
