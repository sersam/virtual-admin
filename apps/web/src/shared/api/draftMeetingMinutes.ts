import {
  MeetingMinutesDraftRequestSchema,
  MeetingMinutesDraftResponseSchema,
  type MeetingMinutesDraftResponse,
} from '@admin/contracts';
import { apiBaseUrl } from './apiConfig';

export async function draftMeetingMinutes(
  notes: string,
  signal?: AbortSignal,
): Promise<MeetingMinutesDraftResponse> {
  const payload = MeetingMinutesDraftRequestSchema.parse({ notes });
  const response = await fetch(`${apiBaseUrl}/api/meeting-minutes/draft`, {
    body: JSON.stringify(payload),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal,
  });

  if (!response.ok) {
    throw new Error(`No se pudo redactar el acta (HTTP ${response.status}).`);
  }

  return MeetingMinutesDraftResponseSchema.parse(await response.json());
}
