export type IncidentType =
  | 'agua'
  | 'electricidad'
  | 'ascensor'
  | 'limpieza'
  | 'seguridad'
  | 'convivencia'
  | 'otro';

export type IncidentPriority = 'baja' | 'media' | 'alta' | 'urgente';
export interface IncidentClassification {
  readonly priority: IncidentPriority;
  readonly suggestedResponsible: string;
  readonly type: IncidentType;
}

interface CommunityIncidentData {
  readonly createdAt: Date;
  readonly description: string;
  readonly id: string;
  readonly sessionId: string;
}

type IncidentResolution =
  | { readonly status: 'pendiente'; readonly resolvedAt: null }
  | { readonly status: 'resuelta'; readonly resolvedAt: Date };

export type CommunityIncident = IncidentClassification & CommunityIncidentData & IncidentResolution;
