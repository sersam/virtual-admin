import type { AiProviderMode } from '@admin/contracts';
import type { IncidentClassification } from '../../domain/incident/CommunityIncident.js';

export interface IncidentClassificationResult {
  readonly classification: IncidentClassification;
  readonly mode: AiProviderMode;
}

export interface IncidentClassifier {
  classify(description: string): Promise<IncidentClassificationResult>;
}
