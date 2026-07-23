import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MeetingAgendaPanel } from './MeetingAgendaPanel';
import { useMeetingAgendaDraft } from '../hooks/useMeetingAgendaDraft';

vi.mock('../hooks/useMeetingAgendaDraft', () => ({
  useMeetingAgendaDraft: vi.fn(),
}));

const useMeetingAgendaDraftMock = vi.mocked(useMeetingAgendaDraft);

describe('MeetingAgendaPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('genera un orden del día editable con entradas trazables', async () => {
    const user = userEvent.setup();
    const generate = vi.fn();
    useMeetingAgendaDraftMock.mockReturnValue({
      generate,
      result: {
        draft: {
          title: 'Orden del día',
          body: 'Orden del día\n\n1. [Urgente] Hay una fuga de agua urgente.',
          items: [
            {
              description: 'Hay una fuga de agua urgente',
              priority: 'urgente',
              sourceType: 'incident',
              sourceId: 'inc-1',
            },
            {
              description: 'Revisar contrato de limpieza',
              priority: 'alta',
              sourceType: 'pending-agreement',
              sourceId: 'pending-1',
              assignee: 'Ana',
              dueDate: '30 de junio',
            },
          ],
        },
        mode: 'deterministic-demo',
      },
      status: 'ready',
    });

    render(<MeetingAgendaPanel />);

    await user.click(screen.getByRole('button', { name: 'Preparar orden del día' }));

    expect(generate).toHaveBeenCalledOnce();
    const editableDraft = screen.getByLabelText('Borrador editable del orden del día');
    expect((editableDraft as HTMLTextAreaElement).value).toContain('Hay una fuga de agua urgente');
    expect(screen.getByText('Entradas utilizadas')).toBeInTheDocument();
    expect(screen.getByText('Hay una fuga de agua urgente')).toBeInTheDocument();
    expect(screen.getByText('Revisar contrato de limpieza')).toBeInTheDocument();
    expect(screen.getByText('Incidencia')).toBeInTheDocument();
    expect(screen.getByText('Acuerdo pendiente')).toBeInTheDocument();

    await user.clear(editableDraft);
    await waitFor(() => expect(editableDraft).toHaveValue(''));
    await user.type(editableDraft, 'Orden revisado para la junta.');

    expect(editableDraft).toHaveValue('Orden revisado para la junta.');
  });

  it('muestra el estado vacío del borrador generado', async () => {
    useMeetingAgendaDraftMock.mockReturnValue({
      generate: vi.fn(),
      result: {
        draft: {
          title: 'Orden del día',
          body: 'No hay asuntos pendientes para incluir en el orden del día.',
          items: [],
        },
        mode: 'deterministic-demo',
      },
      status: 'ready',
    });

    render(<MeetingAgendaPanel />);

    expect(
      screen.getByDisplayValue('No hay asuntos pendientes para incluir en el orden del día.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Sin entradas pendientes')).toBeInTheDocument();
  });
});
