import {
  ChatMessageRequestSchema,
  ChatMessageResponseSchema,
  type ChatMessageResponse,
} from '@admin/contracts';
import { apiBaseUrl } from './apiConfig';

export async function sendChatMessage(
  message: string,
  signal?: AbortSignal,
): Promise<ChatMessageResponse> {
  const payload = ChatMessageRequestSchema.parse({ message });
  const response = await fetch(`${apiBaseUrl}/api/chat/messages`, {
    body: JSON.stringify(payload),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal,
  });

  if (!response.ok) {
    throw new Error(`No se pudo coordinar el mensaje (HTTP ${response.status}).`);
  }

  return ChatMessageResponseSchema.parse(await response.json());
}
