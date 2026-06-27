import { classifyIncident } from '@admin/incidents';
import type { IncidentClassifier } from '../../application/ports/IncidentClassifier.js';
import type { IncidentClassification } from '../../domain/incident/CommunityIncident.js';

export class DeterministicIncidentClassifier implements IncidentClassifier {
  classify(description: string): IncidentClassification {
    return classifyIncident(description);
  }
}
