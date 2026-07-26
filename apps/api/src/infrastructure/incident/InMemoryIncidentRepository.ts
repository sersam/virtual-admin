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
    await this.saveIfAbsent(incident);
  }

  async saveIfAbsent(incident: CommunityIncident): Promise<void> {
    const current = this.incidents.get(incident.sessionId) ?? [];
    if (current.some((storedIncident) => storedIncident.id === incident.id)) return;

    this.incidents.set(incident.sessionId, [...current, incident]);
  }

  async resolve(
    sessionId: string,
    incidentId: string,
    resolvedAt: Date,
  ): Promise<CommunityIncident | undefined> {
    const current = this.incidents.get(sessionId) ?? [];
    const index = current.findIndex((incident) => incident.id === incidentId);
    if (index < 0) return undefined;

    const existing = current[index]!;
    if (existing.status === 'resuelta') return existing;

    const resolved: CommunityIncident = {
      ...existing,
      status: 'resuelta',
      resolvedAt,
    };
    const updated = current.map((incident, currentIndex) =>
      currentIndex === index ? resolved : incident,
    );
    this.incidents.set(sessionId, updated);

    return resolved;
  }
}
