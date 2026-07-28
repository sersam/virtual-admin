import {
  ChatMessageRequestSchema,
  ChatMessageResponseSchema,
  type ChatMessageResponse,
} from '@admin/contracts';
import { ApiHttpError, ApiTransportError, isApiTransportError } from './apiErrors';
import { apiBaseUrl } from './apiConfig';

export class ChatApiHttpError extends ApiHttpError {
  constructor(readonly status: number) {
    super(status, 'coordinar el mensaje');
  }
}

export class ChatApiTransportError extends ApiTransportError {
  constructor(options: { readonly cause?: unknown } = {}) {
    super('coordinar el mensaje', options);
  }
}

export async function sendChatMessage(
  message: string,
  signal?: AbortSignal,
): Promise<ChatMessageResponse> {
  const payload = ChatMessageRequestSchema.parse({ message });
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/chat/messages`, {
      body: JSON.stringify(payload),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal,
    });
  } catch (error) {
    throw new ChatApiTransportError({ cause: error });
  }

  if (!response.ok) {
    throw new ChatApiHttpError(response.status);
  }

  return ChatMessageResponseSchema.parse(await response.json());
}

export function isChatApiTransportError(error: unknown): error is ChatApiTransportError {
  return error instanceof ChatApiTransportError || isApiTransportError(error);
}
