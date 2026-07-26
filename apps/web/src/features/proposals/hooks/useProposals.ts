import type { CommunityProposal } from '@admin/contracts';
import { useEffect, useRef, useState } from 'react';
import {
  createProposal as createProposalRequest,
  listProposals,
} from '../../../shared/api/proposals';

export type ProposalsStatus = 'idle' | 'loading' | 'ready' | 'creating' | 'error';

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 1_000;

interface ProposalsState {
  readonly error?: string;
  readonly proposals: CommunityProposal[];
  readonly status: ProposalsStatus;
  readonly successMessage?: string;
}

export function useProposals() {
  const [state, setState] = useState<ProposalsState>({
    proposals: [],
    status: 'idle',
  });
  const creatingRef = useRef(false);
  const latestLoadRequestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);

    return () => controller.abort();
  }, []);

  async function load(signal?: AbortSignal): Promise<void> {
    const requestId = latestLoadRequestId.current + 1;
    latestLoadRequestId.current = requestId;
    setState((current) => ({
      ...current,
      error: undefined,
      status: 'loading',
      successMessage: undefined,
    }));

    try {
      const proposals = await listProposals(signal);
      if (latestLoadRequestId.current !== requestId) return;
      setState({ proposals, status: 'ready' });
    } catch (error) {
      if (signal?.aborted) return;
      if (latestLoadRequestId.current !== requestId) return;
      console.error('[useProposals] No se pudieron cargar las propuestas de sesión.', error);
      setState((current) => ({
        ...current,
        error: 'No se pudieron cargar las propuestas.',
        status: 'error',
        successMessage: undefined,
      }));
    }
  }

  async function create(description: string): Promise<CommunityProposal | undefined> {
    if (creatingRef.current) return undefined;

    const trimmedDescription = description.trim();
    if (
      trimmedDescription.length < MIN_DESCRIPTION_LENGTH ||
      trimmedDescription.length > MAX_DESCRIPTION_LENGTH
    ) {
      setState((current) => ({
        ...current,
        error: `La descripción debe tener entre ${MIN_DESCRIPTION_LENGTH} y ${MAX_DESCRIPTION_LENGTH} caracteres.`,
        status: 'error',
        successMessage: undefined,
      }));
      return undefined;
    }

    creatingRef.current = true;
    setState((current) => ({
      ...current,
      error: undefined,
      status: 'creating',
      successMessage: undefined,
    }));

    try {
      const proposal = await createProposalRequest(trimmedDescription);
      setState((current) => ({
        proposals: [proposal, ...current.proposals],
        status: 'ready',
        successMessage: 'Propuesta registrada.',
      }));
      return proposal;
    } catch (error) {
      console.error('[useProposals] No se pudo registrar la propuesta.', error);
      setState((current) => ({
        ...current,
        error: 'No se pudo registrar la propuesta. Inténtalo de nuevo.',
        status: 'error',
        successMessage: undefined,
      }));
      return undefined;
    } finally {
      creatingRef.current = false;
    }
  }

  return { ...state, create };
}
