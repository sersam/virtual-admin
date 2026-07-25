import {
  CommunityNoticeDraftRequestSchema,
  CommunityNoticeDraftResponseSchema,
  type CommunityNoticeDraftRequest,
  type CommunityNoticeDraftResponse,
} from '@admin/contracts';
import { apiBaseUrl } from './apiConfig';

export async function draftCommunityNotice(
  input: CommunityNoticeDraftRequest,
  signal?: AbortSignal,
): Promise<CommunityNoticeDraftResponse> {
  const payload = CommunityNoticeDraftRequestSchema.parse(input);
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
