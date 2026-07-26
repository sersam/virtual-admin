import { z } from 'zod';

export const CreateProposalRequestSchema = z
  .object({
    description: z.string().trim().min(10).max(1_000),
  })
  .strict();

export const CommunityProposalSchema = z.object({
  id: z.string().trim().min(1).max(80),
  description: z.string().trim().min(10).max(1_000),
  createdAt: z.iso.datetime(),
});

export const CreateProposalResponseSchema = z
  .object({
    proposal: CommunityProposalSchema,
  })
  .strict();

export const ProposalListResponseSchema = z
  .object({
    proposals: z.array(CommunityProposalSchema),
  })
  .strict();

export type CreateProposalRequest = z.infer<typeof CreateProposalRequestSchema>;
export type CommunityProposal = z.infer<typeof CommunityProposalSchema>;
export type CreateProposalResponse = z.infer<typeof CreateProposalResponseSchema>;
export type ProposalListResponse = z.infer<typeof ProposalListResponseSchema>;
