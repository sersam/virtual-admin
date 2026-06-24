import type { ChatMessageResponse } from '@admin/contracts';
import { useState } from 'react';
import { createLocalChatMessage } from '../../../shared/api/localChatMessage';
import { sendChatMessage } from '../../../shared/api/sendChatMessage';

export type ChatMessageStatus = 'idle' | 'loading' | 'ready' | 'fallback' | 'error';

const MIN_MESSAGE_LENGTH = 3;
const MAX_MESSAGE_LENGTH = 500;

interface ChatMessageState {
  readonly error?: string;
  readonly result?: ChatMessageResponse;
  readonly status: ChatMessageStatus;
}

export function useChatMessage() {
  const [state, setState] = useState<ChatMessageState>({ status: 'idle' });

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
      const result = await sendChatMessage(trimmedMessage);
      setState({ result, status: 'ready' });
    } catch (error) {
      console.error('[useChatMessage] Se usa coordinador local determinista.', error);
      setState({ result: createLocalChatMessage(trimmedMessage), status: 'fallback' });
    }
  }

  return { ...state, submit };
}
