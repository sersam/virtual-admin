import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IncidentsPanel } from './IncidentsPanel';

const waterIncident = {
  id: 'inc-0001',
  description: 'Hay una fuga de agua urgente en el garaje.',
  type: 'agua',
  priority: 'urgente',
  suggestedResponsible: 'Fontanería',
  createdAt: '2026-06-27T10:00:00.000Z',
  status: 'pendiente',
  resolvedAt: null,
};

const resolvedWaterIncident = {
  ...waterIncident,
  status: 'resuelta',
  resolvedAt: '2026-06-27T12:30:00.000Z',
};

const liftIncident = {
  id: 'inc-0002',
  description: 'El ascensor no funciona desde esta mañana.',
  type: 'ascensor',
  priority: 'alta',
  suggestedResponsible: 'Mantenimiento de ascensores',
  createdAt: '2026-06-27T10:05:00.000Z',
  status: 'pendiente',
  resolvedAt: null,
};

describe('IncidentsPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registra una incidencia y muestra su clasificación', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ incidents: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ incident: waterIncident, mode: 'deterministic-demo' }), {
          status: 201,
        }),
      );

    render(<IncidentsPanel />);
    expect(await screen.findByText('Sin incidencias registradas')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Descripción de la incidencia'));
    await user.type(
      screen.getByLabelText('Descripción de la incidencia'),
      'Hay una fuga de agua urgente en el garaje.',
    );
    await user.click(screen.getByRole('button', { name: 'Registrar incidencia' }));

    const incident = await screen.findByRole('article', { name: /fuga de agua urgente/i });
    expect(within(incident).getByText('Agua')).toBeInTheDocument();
    expect(within(incident).getByText('Urgente')).toBeInTheDocument();
    expect(within(incident).getByText('Fontanería')).toBeInTheDocument();
    expect(screen.getByText('Demo determinista')).toBeInTheDocument();
  });

  it('muestra el proveedor OpenAI al crear una incidencia con IA', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ incidents: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ incident: liftIncident, mode: 'openai' }), {
          status: 201,
        }),
      );

    render(<IncidentsPanel />);
    expect(await screen.findByText('Sin incidencias registradas')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Descripción de la incidencia'));
    await user.type(
      screen.getByLabelText('Descripción de la incidencia'),
      'El ascensor no funciona desde esta mañana.',
    );
    await user.click(screen.getByRole('button', { name: 'Registrar incidencia' }));

    expect(await screen.findByText('OpenAI · GPT-5 nano')).toBeInTheDocument();
  });

  it('filtra el listado por tipo de incidencia', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ incidents: [waterIncident, liftIncident] }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ incidents: [liftIncident] }), { status: 200 }),
      );

    render(<IncidentsPanel />);

    expect(
      await screen.findByRole('article', { name: /fuga de agua urgente/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /ascensor no funciona/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Filtrar por tipo'), 'ascensor');

    await waitFor(() =>
      expect(
        screen.queryByRole('article', { name: /fuga de agua urgente/i }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('article', { name: /ascensor no funciona/i })).toBeInTheDocument();
  });

  it('marca una incidencia como resuelta y conserva su tarjeta visible', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ incidents: [waterIncident] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ incident: resolvedWaterIncident }), { status: 200 }),
      );

    render(<IncidentsPanel />);
    const incident = await screen.findByRole('article', { name: /fuga de agua urgente/i });

    await user.click(within(incident).getByRole('button', { name: 'Marcar como resuelta' }));

    expect(within(incident).getByText('Resuelta')).toBeInTheDocument();
    expect(
      within(incident).getByText('Resolución').parentElement?.querySelector('time'),
    ).toHaveAttribute('datetime', resolvedWaterIncident.resolvedAt);
    expect(
      within(incident).queryByRole('button', { name: 'Marcar como resuelta' }),
    ).not.toBeInTheDocument();
  });

  it('muestra validación para descripciones demasiado cortas', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ incidents: [] }), { status: 200 }));

    render(<IncidentsPanel />);
    expect(await screen.findByText('Sin incidencias registradas')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Descripción de la incidencia'));
    await user.type(screen.getByLabelText('Descripción de la incidencia'), 'Fuga');
    await user.click(screen.getByRole('button', { name: 'Registrar incidencia' }));

    expect(screen.getByText(/al menos 10 caracteres/)).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
