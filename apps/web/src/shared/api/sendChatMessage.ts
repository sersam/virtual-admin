import {
  ChatMessageRequestSchema,
  ChatMessageResponseSchema,
  type ChatMessageResponse,
} from '@admin/contracts';
import { apiBaseUrl } from './apiConfig';

export class ChatApiHttpError extends Error {
  constructor(readonly status: number) {
    super(`No se pudo coordinar el mensaje (HTTP ${status}).`);
  }
}

export class ChatApiTransportError extends Error {
  constructor(options: { readonly cause?: unknown } = {}) {
    super('No se pudo conectar con la API del coordinador.', options);
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
  return error instanceof ChatApiTransportError;
}
