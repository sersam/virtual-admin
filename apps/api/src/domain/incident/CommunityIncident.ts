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

export interface CommunityIncident extends IncidentClassification {
  readonly createdAt: Date;
  readonly description: string;
  readonly id: string;
  readonly sessionId: string;
}
