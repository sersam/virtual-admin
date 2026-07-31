import type { ObservabilityResponse } from '@admin/contracts';
import { useEffect, useState } from 'react';
import { fetchObservability } from '../../../shared/api/fetchObservability';

type ObservabilityStatus = 'loading' | 'ready' | 'unavailable';

interface ObservabilityState {
  readonly data?: ObservabilityResponse;
  readonly status: ObservabilityStatus;
}

export function useObservability(): ObservabilityState {
  const [state, setState] = useState<ObservabilityState>({ status: 'loading' });

  useEffect(() => {
    const abortController = new AbortController();

    fetchObservability(abortController.signal)
      .then((data) => setState({ data, status: 'ready' }))
      .catch((error: unknown) => {
        if (abortController.signal.aborted) return;
        console.error('[useObservability] No hay métricas reales disponibles.', error);
        setState({ status: 'unavailable' });
      });

    return () => abortController.abort();
  }, []);

  return state;
}
