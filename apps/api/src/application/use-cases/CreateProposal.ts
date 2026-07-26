import type { CommunityProposal } from '../../domain/proposal/CommunityProposal.js';
import type { Clock } from '../ports/Clock.js';
import type { IdGenerator } from '../ports/IdGenerator.js';
import type { ProposalRepository } from '../ports/ProposalRepository.js';

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 1_000;

interface CreateProposalDependencies {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly repository: ProposalRepository;
}

interface CreateProposalInput {
  readonly description: string;
  readonly sessionId: string;
}

export class InvalidProposalDescriptionError extends Error {
  constructor() {
    super('La descripción de la propuesta debe tener entre 10 y 1000 caracteres.');
  }
}

export class CreateProposal {
  constructor(private readonly dependencies: CreateProposalDependencies) {}

  async execute(input: CreateProposalInput): Promise<CommunityProposal> {
    const description = input.description.trim();
    if (
      description.length < MIN_DESCRIPTION_LENGTH ||
      description.length > MAX_DESCRIPTION_LENGTH
    ) {
      throw new InvalidProposalDescriptionError();
    }

    const proposal: CommunityProposal = {
      id: this.dependencies.ids.randomId(),
      sessionId: input.sessionId,
      description,
      createdAt: this.dependencies.clock.now(),
    };

    await this.dependencies.repository.save(proposal);

    return proposal;
  }
}
