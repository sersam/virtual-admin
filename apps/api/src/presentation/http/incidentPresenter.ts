import type { Incident } from '@admin/contracts';
import type { CommunityIncident } from '../../domain/incident/CommunityIncident.js';

export function presentIncident(incident: CommunityIncident): Incident {
  const common = {
    id: incident.id,
    description: incident.description,
    type: incident.type,
    priority: incident.priority,
    suggestedResponsible: incident.suggestedResponsible,
    createdAt: incident.createdAt.toISOString(),
  };

  return incident.status === 'resuelta'
    ? { ...common, status: 'resuelta', resolvedAt: incident.resolvedAt.toISOString() }
    : { ...common, status: 'pendiente', resolvedAt: null };
}
