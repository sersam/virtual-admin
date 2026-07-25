import type { Meeting } from '@admin/contracts';
import { useEffect, useState } from 'react';
import { listMeetings } from '../../../shared/api/listMeetings';

export type MeetingsStatus = 'loading' | 'ready' | 'error';

interface MeetingsState {
  readonly error?: string;
  readonly meetings: Meeting[];
  readonly status: MeetingsStatus;
}

export function useMeetings(): MeetingsState {
  const [state, setState] = useState<MeetingsState>({ meetings: [], status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    async function loadMeetings(): Promise<void> {
      try {
        const response = await listMeetings(controller.signal);
        setState({ meetings: response.meetings, status: 'ready' });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('[useMeetings] No se pudieron cargar las juntas demo.', error);
        setState({
          error: 'No se pudieron cargar las juntas demo.',
          meetings: [],
          status: 'error',
        });
      }
    }

    void loadMeetings();

    return () => controller.abort();
  }, []);

  return state;
}
