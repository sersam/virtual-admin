import type { CommunityProposal as ProposalDto } from '@admin/contracts';
import type { CommunityProposal } from '../../domain/proposal/CommunityProposal.js';

export function presentProposal(proposal: CommunityProposal): ProposalDto {
  return {
    id: proposal.id,
    description: proposal.description,
    createdAt: proposal.createdAt.toISOString(),
  };
}
