import type { CommunityNoticeDraftResponse } from '@admin/contracts';
import { useState } from 'react';
import { draftCommunityNotice } from '../../../shared/api/draftCommunityNotice';
import { createLocalCommunityNoticeDraft } from '../../../shared/api/localCommunityNoticeDraft';

export type CommunityNoticeDraftStatus = 'idle' | 'loading' | 'ready' | 'fallback' | 'error';

const MIN_MESSAGE_LENGTH = 3;
const MAX_MESSAGE_LENGTH = 500;

interface CommunityNoticeDraftState {
  readonly error?: string;
  readonly result?: CommunityNoticeDraftResponse;
  readonly status: CommunityNoticeDraftStatus;
}

export function useCommunityNoticeDraft() {
  const [state, setState] = useState<CommunityNoticeDraftState>({ status: 'idle' });

  async function submit(message: string): Promise<void> {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < MIN_MESSAGE_LENGTH || trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setState({
        error: 'El mensaje debe tener entre 3 y 500 caracteres.',
        status: 'error',
      });
      return;
    }

    setState({ status: 'loading' });

    try {
      const result = await draftCommunityNotice(trimmedMessage);
      setState({ result, status: 'ready' });
    } catch (error) {
      console.error('[useCommunityNoticeDraft] Se usa redacción local determinista.', error);
      setState({ result: createLocalCommunityNoticeDraft(trimmedMessage), status: 'fallback' });
    }
  }

  return { ...state, submit };
}
