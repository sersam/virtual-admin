import type { MeetingMinutesDraftResponse } from '@admin/contracts';
import { useRef, useState } from 'react';
import { draftMeetingMinutes } from '../../../shared/api/draftMeetingMinutes';
import { createLocalMeetingMinutesDraft } from '../../../shared/api/localMeetingMinutesDraft';

export type MeetingMinutesDraftStatus = 'idle' | 'loading' | 'ready' | 'fallback' | 'error';

const MIN_NOTES_LENGTH = 10;
const MAX_NOTES_LENGTH = 4_000;

interface MeetingMinutesDraftState {
  readonly error?: string;
  readonly result?: MeetingMinutesDraftResponse;
  readonly status: MeetingMinutesDraftStatus;
}

export function useMeetingMinutesDraft() {
  const [state, setState] = useState<MeetingMinutesDraftState>({ status: 'idle' });
  const latestRequestId = useRef(0);

  async function submit(notes: string): Promise<void> {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    const trimmedNotes = notes.trim();
    if (trimmedNotes.length < MIN_NOTES_LENGTH || trimmedNotes.length > MAX_NOTES_LENGTH) {
      setState({
        error: `Las notas deben tener entre ${MIN_NOTES_LENGTH} y ${MAX_NOTES_LENGTH} caracteres.`,
        status: 'error',
      });
      return;
    }

    setState({ status: 'loading' });

    try {
      const result = await draftMeetingMinutes(trimmedNotes);
      if (requestId !== latestRequestId.current) return;
      setState({ result, status: 'ready' });
    } catch (error) {
      if (requestId !== latestRequestId.current) return;
      console.error('[useMeetingMinutesDraft] Se usa redacción local determinista.', error);
      setState({ result: createLocalMeetingMinutesDraft(trimmedNotes), status: 'fallback' });
    }
  }

  return { ...state, submit };
}
