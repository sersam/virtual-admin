import type { IncidentClassification } from '../../domain/incident/CommunityIncident.js';
import type { AiProviderMode } from './AiProviderMode.js';

export interface IncidentClassificationResult {
  readonly classification: IncidentClassification;
  readonly mode: AiProviderMode;
}

export interface IncidentClassifier {
  classify(description: string): Promise<IncidentClassificationResult>;
}
