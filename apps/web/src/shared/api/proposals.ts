import {
  CreateProposalRequestSchema,
  CreateProposalResponseSchema,
  ErrorResponseSchema,
  ProposalListResponseSchema,
  type CommunityProposal,
} from '@admin/contracts';
import { apiBaseUrl } from './apiConfig';

export async function createProposal(
  description: string,
  signal?: AbortSignal,
): Promise<CommunityProposal> {
  const payload = CreateProposalRequestSchema.parse({ description });
  const response = await fetch(`${apiBaseUrl}/api/proposals`, {
    body: JSON.stringify(payload),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal,
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `No se pudo registrar la propuesta (HTTP ${response.status}).`,
      ),
    );
  }

  return CreateProposalResponseSchema.parse(await response.json()).proposal;
}

export async function listProposals(signal?: AbortSignal): Promise<CommunityProposal[]> {
  const response = await fetch(`${apiBaseUrl}/api/proposals`, {
    credentials: 'include',
    method: 'GET',
    signal,
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `No se pudieron listar las propuestas (HTTP ${response.status}).`,
      ),
    );
  }

  return ProposalListResponseSchema.parse(await response.json()).proposals;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => undefined);

  return ErrorResponseSchema.safeParse(body).data?.error.message ?? fallback;
}
