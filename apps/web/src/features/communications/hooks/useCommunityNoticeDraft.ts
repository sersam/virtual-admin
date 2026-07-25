import type { CommunityNoticeDraftRequest, CommunityNoticeDraftResponse } from '@admin/contracts';
import { useState } from 'react';
import { draftCommunityNotice } from '../../../shared/api/draftCommunityNotice';
import { createLocalCommunityNoticeDraft } from '../../../shared/api/localCommunityNoticeDraft';

export type CommunityNoticeDraftStatus = 'idle' | 'loading' | 'ready' | 'fallback' | 'error';

const MIN_SUBJECT_LENGTH = 3;
const MAX_SUBJECT_LENGTH = 120;

interface CommunityNoticeDraftState {
  readonly error?: string;
  readonly result?: CommunityNoticeDraftResponse;
  readonly status: CommunityNoticeDraftStatus;
}

export function useCommunityNoticeDraft() {
  const [state, setState] = useState<CommunityNoticeDraftState>({ status: 'idle' });

  async function submit(
    input: CommunityNoticeDraftRequest,
  ): Promise<CommunityNoticeDraftResponse | undefined> {
    const trimmedSubject = input.subject.trim();
    if (trimmedSubject.length < MIN_SUBJECT_LENGTH || trimmedSubject.length > MAX_SUBJECT_LENGTH) {
      setState({
        error: `El asunto debe tener entre ${MIN_SUBJECT_LENGTH} y ${MAX_SUBJECT_LENGTH} caracteres.`,
        status: 'error',
      });
      return undefined;
    }

    setState({ status: 'loading' });

    try {
      const result = await draftCommunityNotice({ ...input, subject: trimmedSubject });
      setState({ result, status: 'ready' });
      return result;
    } catch (error) {
      console.error('[useCommunityNoticeDraft] Se usa redacción local determinista.', error);
      const result = createLocalCommunityNoticeDraft({ ...input, subject: trimmedSubject });
      setState({
        result,
        status: 'fallback',
      });
      return result;
    }
  }

  return { ...state, submit };
}
