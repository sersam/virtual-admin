import type { CommunityProposal } from '../../domain/proposal/CommunityProposal.js';
import type { ProposalRepository } from '../ports/ProposalRepository.js';

interface ListProposalsDependencies {
  readonly repository: ProposalRepository;
}

interface ListProposalsInput {
  readonly sessionId: string;
}

export class ListProposals {
  constructor(private readonly dependencies: ListProposalsDependencies) {}

  async execute(input: ListProposalsInput): Promise<CommunityProposal[]> {
    const proposals = await this.dependencies.repository.listBySession(input.sessionId);

    return [...proposals].sort(compareRecentFirst);
  }
}

function compareRecentFirst(first: CommunityProposal, second: CommunityProposal): number {
  const createdAtDiff = second.createdAt.getTime() - first.createdAt.getTime();
  if (createdAtDiff !== 0) return createdAtDiff;

  return 0;
}
