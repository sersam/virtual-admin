import type {
  IncidentListFilters,
  IncidentRepository,
} from '../../application/ports/IncidentRepository.js';
import type { CommunityIncident } from '../../domain/incident/CommunityIncident.js';

export class InMemoryIncidentRepository implements IncidentRepository {
  private readonly incidents = new Map<string, CommunityIncident[]>();

  async listBySession(
    sessionId: string,
    filters: IncidentListFilters = {},
  ): Promise<CommunityIncident[]> {
    return (this.incidents.get(sessionId) ?? []).filter(
      (incident) => !filters.type || incident.type === filters.type,
    );
  }

  async save(incident: CommunityIncident): Promise<void> {
    const current = this.incidents.get(incident.sessionId) ?? [];
    this.incidents.set(incident.sessionId, [...current, incident]);
  }
}
