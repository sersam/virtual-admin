import {
  CreateIncidentRequestSchema,
  CreateIncidentResponseSchema,
  IncidentListResponseSchema,
  ResolveIncidentResponseSchema,
  type CreateIncidentResponse,
  type Incident,
  type IncidentType,
  type ResolveIncidentResponse,
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
  const query = new URLSearchParams();
  if (type) query.set('type', type);
  const queryString = query.toString();

  const response = await fetch(
    `${apiBaseUrl}/api/incidents${queryString ? `?${queryString}` : ''}`,
    {
      credentials: 'include',
      method: 'GET',
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`No se pudieron listar las incidencias (HTTP ${response.status}).`);
  }

  return IncidentListResponseSchema.parse(await response.json()).incidents;
}

export async function resolveIncident(
  incidentId: string,
  signal?: AbortSignal,
): Promise<ResolveIncidentResponse['incident']> {
  const response = await fetch(
    `${apiBaseUrl}/api/incidents/${encodeURIComponent(incidentId)}/resolve`,
    {
      credentials: 'include',
      method: 'PATCH',
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`No se pudo resolver la incidencia (HTTP ${response.status}).`);
  }

  return ResolveIncidentResponseSchema.parse(await response.json()).incident;
}
