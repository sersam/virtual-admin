import {
  MeetingMinutesDraftRequestSchema,
  MeetingMinutesDraftResponseSchema,
  type MeetingMinutesDraftResponse,
} from '@admin/contracts';
import { ApiHttpError, ApiTransportError } from './apiErrors';
import { apiBaseUrl } from './apiConfig';

export class MeetingMinutesApiHttpError extends ApiHttpError {
  constructor(readonly status: number) {
    super(status, 'redactar el acta');
  }
}

export class MeetingMinutesApiTransportError extends ApiTransportError {
  constructor(options: { readonly cause?: unknown } = {}) {
    super('redactar el acta', options);
  }
}

export async function draftMeetingMinutes(
  notes: string,
  signal?: AbortSignal,
): Promise<MeetingMinutesDraftResponse> {
  const payload = MeetingMinutesDraftRequestSchema.parse({ notes });
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/meeting-minutes/draft`, {
      body: JSON.stringify(payload),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal,
    });
  } catch (error) {
    throw new MeetingMinutesApiTransportError({ cause: error });
  }

  if (!response.ok) {
    throw new MeetingMinutesApiHttpError(response.status);
  }

  return MeetingMinutesDraftResponseSchema.parse(await response.json());
}
