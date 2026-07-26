import type { CommunityIncident, IncidentType } from '../../domain/incident/CommunityIncident.js';

export interface IncidentListFilters {
  readonly type?: IncidentType;
}

export interface IncidentRepository {
  listBySession(sessionId: string, filters?: IncidentListFilters): Promise<CommunityIncident[]>;
  resolve(
    sessionId: string,
    incidentId: string,
    resolvedAt: Date,
  ): Promise<CommunityIncident | undefined>;
  save(incident: CommunityIncident): Promise<void>;
  saveIfAbsent(incident: CommunityIncident): Promise<void>;
}
