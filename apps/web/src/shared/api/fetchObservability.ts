import { ObservabilityResponseSchema, type ObservabilityResponse } from '@admin/contracts';
import { apiBaseUrl } from './apiConfig';

export async function fetchObservability(signal?: AbortSignal): Promise<ObservabilityResponse> {
  const response = await fetch(`${apiBaseUrl}/api/observability`, {
    credentials: 'include',
    method: 'GET',
    signal,
  });

  if (!response.ok) {
    throw new Error(`No se pudieron cargar las métricas técnicas (HTTP ${response.status}).`);
  }

  return ObservabilityResponseSchema.parse(await response.json());
}
