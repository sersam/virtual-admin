import type { SessionResponse } from '@admin/contracts';
import { useEffect, useState } from 'react';
import { fetchSession } from '../../../shared/api/fetchSession';
import { createLocalDemoSession } from '../../../shared/api/localDemoSession';

export type SessionStatus = 'loading' | 'ready' | 'fallback';

interface DemoSessionState {
  readonly status: SessionStatus;
  readonly data: SessionResponse;
}

export function useDemoSession(): DemoSessionState {
  const [state, setState] = useState<DemoSessionState>({
    status: 'loading',
    data: createLocalDemoSession(),
  });

  useEffect(() => {
    const abortController = new AbortController();

    fetchSession(abortController.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch(() => {
        if (abortController.signal.aborted) return;
        setState({ status: 'fallback', data: createLocalDemoSession() });
      });

    return () => abortController.abort();
  }, []);

  return state;
}
