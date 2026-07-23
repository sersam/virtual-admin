import type { IncidentClassification } from '../../domain/incident/CommunityIncident.js';

export interface IncidentClassifier {
  classify(description: string): IncidentClassification;
}
