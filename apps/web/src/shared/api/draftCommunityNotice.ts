import {
  CommunityNoticeDraftRequestSchema,
  CommunityNoticeDraftResponseSchema,
  type CommunityNoticeDraftResponse,
} from '@admin/contracts';
import { apiBaseUrl } from './apiConfig';

export async function draftCommunityNotice(
  message: string,
  signal?: AbortSignal,
): Promise<CommunityNoticeDraftResponse> {
  const payload = CommunityNoticeDraftRequestSchema.parse({ message });
  const response = await fetch(`${apiBaseUrl}/api/communications/draft`, {
    body: JSON.stringify(payload),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal,
  });

  if (!response.ok) {
    throw new Error(`No se pudo redactar el comunicado (HTTP ${response.status}).`);
  }

  return CommunityNoticeDraftResponseSchema.parse(await response.json());
}
