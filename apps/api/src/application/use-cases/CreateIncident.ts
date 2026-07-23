import type { Incident } from '@admin/contracts';
import type { IncidentClassifier } from '../ports/IncidentClassifier.js';
import type { IncidentRepository } from '../ports/IncidentRepository.js';
import type { Clock } from '../ports/Clock.js';
import type { IdGenerator } from '../ports/IdGenerator.js';
import type { CommunityIncident } from '../../domain/incident/CommunityIncident.js';

const MIN_DESCRIPTION_LENGTH = 10;

interface CreateIncidentDependencies {
  readonly classifier: IncidentClassifier;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly repository: IncidentRepository;
}

interface CreateIncidentInput {
  readonly description: string;
  readonly sessionId: string;
}

export class InvalidIncidentDescriptionError extends Error {
  constructor() {
    super('La descripción de la incidencia debe tener al menos 10 caracteres.');
  }
}

export class CreateIncident {
  constructor(private readonly dependencies: CreateIncidentDependencies) {}

  async execute(input: CreateIncidentInput): Promise<Incident> {
    const description = input.description.trim();
    if (description.length < MIN_DESCRIPTION_LENGTH) {
      throw new InvalidIncidentDescriptionError();
    }

    const classification = this.dependencies.classifier.classify(description);
    const incident: CommunityIncident = {
      id: this.dependencies.ids.randomId(),
      sessionId: input.sessionId,
      description,
      ...classification,
      createdAt: this.dependencies.clock.now(),
    };

    await this.dependencies.repository.save(incident);

    return presentIncident(incident);
  }
}

export function presentIncident(incident: CommunityIncident): Incident {
  return {
    id: incident.id,
    description: incident.description,
    type: incident.type,
    priority: incident.priority,
    suggestedResponsible: incident.suggestedResponsible,
    createdAt: incident.createdAt.toISOString(),
  };
}
