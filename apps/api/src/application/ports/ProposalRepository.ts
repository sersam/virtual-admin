import type { CommunityProposal } from '../../domain/proposal/CommunityProposal.js';

export interface ProposalRepository {
  listBySession(sessionId: string): Promise<CommunityProposal[]>;
  save(proposal: CommunityProposal): Promise<void>;
}
