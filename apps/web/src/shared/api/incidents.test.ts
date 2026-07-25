import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIncident, listIncidents, resolveIncident } from './incidents';

const incident = {
  id: 'inc-0001',
  description: 'Hay una fuga de agua urgente en el garaje.',
  type: 'agua',
  priority: 'urgente',
  suggestedResponsible: 'Fontanería',
  suggestedNotice: [
    'Estimados vecinos:',
    '',
    'Se ha registrado la siguiente incidencia: Hay una fuga de agua urgente en el garaje.',
    '',
    'La administración comunicará cualquier novedad relevante.',
  ].join('\n'),
  createdAt: '2026-06-27T10:00:00.000Z',
  status: 'pendiente',
  resolvedAt: null,
};

const resolvedIncident = {
  ...incident,
  status: 'resuelta',
  resolvedAt: '2026-06-27T12:30:00.000Z',
};

describe('incidents api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('crea una incidencia clasificada', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ incident, mode: 'deterministic-demo' }), { status: 201 }),
    );

    await expect(createIncident('  Hay una fuga de agua urgente en el garaje.  ')).resolves.toEqual(
      {
        incident,
        mode: 'deterministic-demo',
      },
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/incidents',
      expect.objectContaining({
        body: JSON.stringify({ description: incident.description }),
        credentials: 'include',
        method: 'POST',
      }),
    );
  });

  it('lista incidencias de sesión con filtro opcional por tipo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ incidents: [incident] }), { status: 200 }),
    );

    await expect(listIncidents('agua')).resolves.toEqual([incident]);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/incidents?type=agua',
      expect.objectContaining({ credentials: 'include', method: 'GET' }),
    );
  });

  it('marca una incidencia como resuelta', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ incident: resolvedIncident }), { status: 200 }),
    );

    await expect(resolveIncident(incident.id)).resolves.toEqual(resolvedIncident);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/incidents/${incident.id}/resolve`,
      expect.objectContaining({ credentials: 'include', method: 'PATCH' }),
    );
  });

  it('rechaza errores HTTP al resolver incidencias', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'INCIDENT_NOT_FOUND' } }), { status: 404 }),
    );

    await expect(resolveIncident(incident.id)).rejects.toThrow('No se pudo resolver la incidencia');
  });

  it('rechaza respuestas inválidas al resolver incidencias', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ incident: { ...resolvedIncident, resolvedAt: null } }), {
        status: 200,
      }),
    );

    await expect(resolveIncident(incident.id)).rejects.toThrow();
  });

  it('rechaza errores HTTP y respuestas inválidas', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR' } }), { status: 500 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ incidents: [{ ...incident, type: 'x' }] })),
      );

    await expect(createIncident(incident.description)).rejects.toThrow(
      'No se pudo registrar la incidencia',
    );
    await expect(listIncidents()).rejects.toThrow();
  });
});
