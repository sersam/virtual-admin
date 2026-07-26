import type { ProposalRepository } from '../../application/ports/ProposalRepository.js';
import type { CommunityProposal } from '../../domain/proposal/CommunityProposal.js';

export class InMemoryProposalRepository implements ProposalRepository {
  private readonly proposals = new Map<string, CommunityProposal[]>();

  async listBySession(sessionId: string): Promise<CommunityProposal[]> {
    return this.proposals.get(sessionId) ?? [];
  }

  async save(proposal: CommunityProposal): Promise<void> {
    const current = this.proposals.get(proposal.sessionId) ?? [];
    this.proposals.set(proposal.sessionId, [...current, proposal]);
  }
}
