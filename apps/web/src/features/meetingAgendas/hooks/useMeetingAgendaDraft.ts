import type { MeetingAgendaDraftResponse } from '@admin/contracts';
import { useRef, useState } from 'react';
import { draftMeetingAgenda } from '../../../shared/api/draftMeetingAgenda';

export type MeetingAgendaDraftStatus = 'idle' | 'loading' | 'ready' | 'error';

interface MeetingAgendaDraftState {
  readonly error?: string;
  readonly result?: MeetingAgendaDraftResponse;
  readonly status: MeetingAgendaDraftStatus;
}

export function useMeetingAgendaDraft() {
  const [state, setState] = useState<MeetingAgendaDraftState>({ status: 'idle' });
  const latestRequestId = useRef(0);

  async function generate(): Promise<void> {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    setState({ status: 'loading' });

    try {
      const result = await draftMeetingAgenda();
      if (requestId !== latestRequestId.current) return;
      setState({ result, status: 'ready' });
    } catch (error) {
      if (requestId !== latestRequestId.current) return;
      console.error('[useMeetingAgendaDraft] No se pudo preparar el orden del día.', error);
      setState({
        error: 'No se pudo preparar el orden del día.',
        status: 'error',
      });
    }
  }

  return { ...state, generate };
}
