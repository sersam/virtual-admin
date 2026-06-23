import { SessionResponseSchema, type SessionResponse } from '@admin/contracts';
import { apiBaseUrl } from './apiConfig';

export async function fetchSession(signal?: AbortSignal): Promise<SessionResponse> {
  const response = await fetch(`${apiBaseUrl}/api/session`, {
    credentials: 'include',
    signal,
  });

  if (!response.ok) throw new Error(`No se pudo obtener la sesión demo (HTTP ${response.status}).`);

  return SessionResponseSchema.parse(await response.json());
}
