import type { CreateIncidentResponse, Incident } from '@admin/contracts';
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

  async execute(input: CreateIncidentInput): Promise<CreateIncidentResponse> {
    const description = input.description.trim();
    if (description.length < MIN_DESCRIPTION_LENGTH) {
      throw new InvalidIncidentDescriptionError();
    }

    const classificationResult = await this.dependencies.classifier.classify(description);
    const incident: CommunityIncident = {
      id: this.dependencies.ids.randomId(),
      sessionId: input.sessionId,
      description,
      ...classificationResult.classification,
      createdAt: this.dependencies.clock.now(),
      status: 'pendiente',
      resolvedAt: null,
    };

    await this.dependencies.repository.save(incident);

    return { incident: presentIncident(incident), mode: classificationResult.mode };
  }
}

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
