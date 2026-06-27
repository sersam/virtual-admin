import type { CommunityIncident, IncidentType } from '../../domain/incident/CommunityIncident.js';

export interface IncidentListFilters {
  readonly type?: IncidentType;
}

export interface IncidentRepository {
  listBySession(sessionId: string, filters?: IncidentListFilters): Promise<CommunityIncident[]>;
  save(incident: CommunityIncident): Promise<void>;
}
