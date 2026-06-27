import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIncidents } from './useIncidents';

const waterIncident = {
  id: 'inc-0001',
  description: 'Hay una fuga de agua urgente en el garaje.',
  type: 'agua',
  priority: 'urgente',
  suggestedResponsible: 'Fontanería',
  createdAt: '2026-06-27T10:00:00.000Z',
};

const liftIncident = {
  ...waterIncident,
  id: 'inc-0002',
  description: 'El ascensor no funciona desde esta mañana.',
  type: 'ascensor',
  priority: 'alta',
  suggestedResponsible: 'Mantenimiento de ascensores',
};

describe('useIncidents', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carga incidencias de sesión al inicializar', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ incidents: [waterIncident] }), { status: 200 }),
    );

    const { result } = renderHook(() => useIncidents());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.incidents).toEqual([waterIncident]);
  });

  it('crea incidencias y las añade al listado local', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ incidents: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ incident: waterIncident, mode: 'deterministic-demo' }), {
          status: 201,
        }),
      );
    const { result } = renderHook(() => useIncidents());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() => result.current.create('Hay una fuga de agua urgente en el garaje.'));

    expect(result.current.status).toBe('ready');
    expect(result.current.incidents).toEqual([waterIncident]);
  });

  it('filtra incidencias por tipo desde la API', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ incidents: [waterIncident, liftIncident] }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ incidents: [liftIncident] }), { status: 200 }),
      );
    const { result } = renderHook(() => useIncidents());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() => result.current.filterByType('ascensor'));

    expect(result.current.selectedType).toBe('ascensor');
    expect(result.current.incidents).toEqual([liftIncident]);
  });

  it('valida descripciones demasiado cortas antes de llamar a la API', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ incidents: [] }), { status: 200 }));
    const { result } = renderHook(() => useIncidents());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() => result.current.create('Fuga'));

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('al menos 10 caracteres');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('usa listado vacío si la carga inicial falla', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => useIncidents());

    await waitFor(() => expect(result.current.status).toBe('fallback'));
    expect(result.current.incidents).toEqual([]);
  });
});
