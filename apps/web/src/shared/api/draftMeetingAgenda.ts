import {
  MeetingAgendaDraftRequestSchema,
  MeetingAgendaDraftResponseSchema,
  type MeetingAgendaDraftResponse,
} from '@admin/contracts';
import { apiBaseUrl } from './apiConfig';

export async function draftMeetingAgenda(
  meetingId: string,
  signal?: AbortSignal,
): Promise<MeetingAgendaDraftResponse> {
  const payload = MeetingAgendaDraftRequestSchema.parse({ meetingId });
  const response = await fetch(`${apiBaseUrl}/api/meeting-agendas/draft`, {
    body: JSON.stringify(payload),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal,
  });

  if (!response.ok) {
    throw new Error(`No se pudo preparar el orden del día (HTTP ${response.status}).`);
  }

  return MeetingAgendaDraftResponseSchema.parse(await response.json());
}
