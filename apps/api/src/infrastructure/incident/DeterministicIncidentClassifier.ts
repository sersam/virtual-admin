import { classifyIncident } from '@admin/incidents';
import type {
  IncidentClassificationResult,
  IncidentClassifier,
} from '../../application/ports/IncidentClassifier.js';

export class DeterministicIncidentClassifier implements IncidentClassifier {
  async classify(description: string): Promise<IncidentClassificationResult> {
    return { classification: classifyIncident(description), mode: 'deterministic-demo' };
  }
}
