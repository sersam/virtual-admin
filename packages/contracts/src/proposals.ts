import { z } from 'zod';

export const ProposalDescriptionMinLength = 10;
export const ProposalDescriptionMaxLength = 1_000;

export const CreateProposalRequestSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(ProposalDescriptionMinLength)
      .max(ProposalDescriptionMaxLength),
  })
  .strict();

export const CommunityProposalSchema = z.object({
  id: z.string().trim().min(1).max(80),
  description: z
    .string()
    .trim()
    .min(ProposalDescriptionMinLength)
    .max(ProposalDescriptionMaxLength),
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
