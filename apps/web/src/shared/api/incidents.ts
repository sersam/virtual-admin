import {
  CreateIncidentRequestSchema,
  CreateIncidentResponseSchema,
  IncidentListResponseSchema,
  type CreateIncidentResponse,
  type Incident,
  type IncidentType,
} from '@admin/contracts';
import { apiBaseUrl } from './apiConfig';

export async function createIncident(
  description: string,
  signal?: AbortSignal,
): Promise<CreateIncidentResponse> {
  const payload = CreateIncidentRequestSchema.parse({ description });
  const response = await fetch(`${apiBaseUrl}/api/incidents`, {
    body: JSON.stringify(payload),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal,
  });

  if (!response.ok) {
    throw new Error(`No se pudo registrar la incidencia (HTTP ${response.status}).`);
  }

  return CreateIncidentResponseSchema.parse(await response.json());
}

export async function listIncidents(
  type?: IncidentType,
  signal?: AbortSignal,
): Promise<Incident[]> {
  const url = new URL(`${apiBaseUrl}/api/incidents`);
  if (type) url.searchParams.set('type', type);

  const response = await fetch(url.toString(), {
    credentials: 'include',
    method: 'GET',
    signal,
  });

  if (!response.ok) {
    throw new Error(`No se pudieron listar las incidencias (HTTP ${response.status}).`);
  }

  return IncidentListResponseSchema.parse(await response.json()).incidents;
}
