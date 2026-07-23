import type { Incident, IncidentType } from '@admin/contracts';
import { classifyIncident, type IncidentClassification } from '@admin/incidents';
import { useEffect, useRef, useState } from 'react';
import { createIncident, listIncidents } from '../../../shared/api/incidents';

export type IncidentsStatus = 'idle' | 'loading' | 'ready' | 'creating' | 'fallback' | 'error';

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 1_000;

interface IncidentsState {
  readonly error?: string;
  readonly incidents: Incident[];
  readonly localClassification?: IncidentClassification;
  readonly selectedType?: IncidentType;
  readonly status: IncidentsStatus;
}

export function useIncidents() {
  const [state, setState] = useState<IncidentsState>({
    incidents: [],
    status: 'idle',
  });
  const latestLoadRequestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    void load(undefined, controller.signal);

    return () => controller.abort();
  }, []);

  async function load(type?: IncidentType, signal?: AbortSignal): Promise<void> {
    const requestId = latestLoadRequestId.current + 1;
    latestLoadRequestId.current = requestId;

    setState((current) => ({
      ...current,
      error: undefined,
      localClassification: undefined,
      selectedType: type,
      status: 'loading',
    }));

    try {
      const incidents = await listIncidents(type, signal);
      if (latestLoadRequestId.current !== requestId) return;
      setState({ incidents, selectedType: type, status: 'ready' });
    } catch (error) {
      if (signal?.aborted) return;
      if (latestLoadRequestId.current !== requestId) return;
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
        localClassification: undefined,
        status: 'error',
      }));
      return;
    }

    setState((current) => ({
      ...current,
      error: undefined,
      localClassification: undefined,
      status: 'creating',
    }));

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
      const localClassification = classifyIncident(trimmedDescription);
      setState((current) => ({
        ...current,
        error: 'No se pudo registrar la incidencia. Inténtalo de nuevo.',
        localClassification,
        status: 'error',
      }));
    }
  }

  async function filterByType(type?: IncidentType): Promise<void> {
    await load(type);
  }

  return { ...state, create, filterByType };
}
