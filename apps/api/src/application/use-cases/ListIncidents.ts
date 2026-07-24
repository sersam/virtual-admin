import type { IncidentRepository } from '../ports/IncidentRepository.js';
import type { CommunityIncident, IncidentType } from '../../domain/incident/CommunityIncident.js';

interface ListIncidentsDependencies {
  readonly repository: IncidentRepository;
}

interface ListIncidentsInput {
  readonly sessionId: string;
  readonly type?: IncidentType;
}

export class ListIncidents {
  constructor(private readonly dependencies: ListIncidentsDependencies) {}

  async execute(input: ListIncidentsInput): Promise<CommunityIncident[]> {
    return this.dependencies.repository.listBySession(input.sessionId, {
      type: input.type,
    });
  }
}
