import type { Incident, IncidentType } from '@admin/contracts';
import type { IncidentRepository } from '../ports/IncidentRepository.js';
import { presentIncident } from './CreateIncident.js';

interface ListIncidentsDependencies {
  readonly repository: IncidentRepository;
}

interface ListIncidentsInput {
  readonly sessionId: string;
  readonly type?: IncidentType;
}

export class ListIncidents {
  constructor(private readonly dependencies: ListIncidentsDependencies) {}

  async execute(input: ListIncidentsInput): Promise<Incident[]> {
    const incidents = await this.dependencies.repository.listBySession(input.sessionId, {
      type: input.type,
    });

    return incidents.map(presentIncident);
  }
}
