import { MeetingListResponseSchema, type MeetingListResponse } from '@admin/contracts';
import { apiBaseUrl } from './apiConfig';

export async function listMeetings(signal?: AbortSignal): Promise<MeetingListResponse> {
  const response = await fetch(`${apiBaseUrl}/api/meetings`, {
    credentials: 'include',
    method: 'GET',
    signal,
  });

  if (!response.ok) {
    throw new Error(`No se pudieron cargar las juntas (HTTP ${response.status}).`);
  }

  return MeetingListResponseSchema.parse(await response.json());
}
