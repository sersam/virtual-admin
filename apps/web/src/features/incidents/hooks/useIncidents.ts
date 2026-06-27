import type { Incident, IncidentType } from '@admin/contracts';
import { useEffect, useState } from 'react';
import { createIncident, listIncidents } from '../../../shared/api/incidents';

export type IncidentsStatus = 'idle' | 'loading' | 'ready' | 'creating' | 'fallback' | 'error';

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 1_000;

interface IncidentsState {
  readonly error?: string;
  readonly incidents: Incident[];
  readonly selectedType?: IncidentType;
  readonly status: IncidentsStatus;
}

export function useIncidents() {
  const [state, setState] = useState<IncidentsState>({
    incidents: [],
    status: 'idle',
  });

  useEffect(() => {
    const controller = new AbortController();
    void load(undefined, controller.signal);

    return () => controller.abort();
  }, []);

  async function load(type?: IncidentType, signal?: AbortSignal): Promise<void> {
    setState((current) => ({
      ...current,
      error: undefined,
      selectedType: type,
      status: 'loading',
    }));

    try {
      const incidents = await listIncidents(type, signal);
      setState({ incidents, selectedType: type, status: 'ready' });
    } catch (error) {
      if (signal?.aborted) return;
      console.error('[useIncidents] No se pudieron cargar las incidencias de sesión.', error);
      setState({ incidents: [], selectedType: type, status: 'fallback' });
    }
  }

  async function create(description: string): Promise<void> {
    const trimmedDescription = description.trim();
    if (
      trimmedDescription.length < MIN_DESCRIPTION_LENGTH ||
      trimmedDescription.length > MAX_DESCRIPTION_LENGTH
    ) {
      setState((current) => ({
        ...current,
        error: `La descripción debe tener al menos ${MIN_DESCRIPTION_LENGTH} caracteres y como máximo ${MAX_DESCRIPTION_LENGTH}.`,
        status: 'error',
      }));
      return;
    }

    setState((current) => ({ ...current, error: undefined, status: 'creating' }));

    try {
      const response = await createIncident(trimmedDescription);
      setState((current) => ({
        incidents:
          current.selectedType && response.incident.type !== current.selectedType
            ? current.incidents
            : [...current.incidents, response.incident],
        selectedType: current.selectedType,
        status: 'ready',
      }));
    } catch (error) {
      console.error('[useIncidents] No se pudo registrar la incidencia.', error);
      setState((current) => ({
        ...current,
        error: 'No se pudo registrar la incidencia. Inténtalo de nuevo.',
        status: 'error',
      }));
    }
  }

  async function filterByType(type?: IncidentType): Promise<void> {
    await load(type);
  }

  return { ...state, create, filterByType };
}
