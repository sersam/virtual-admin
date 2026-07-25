import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MeetingAgendaPanel } from './MeetingAgendaPanel';
import { useMeetingAgendaDraft } from '../hooks/useMeetingAgendaDraft';
import { useMeetings } from '../hooks/useMeetings';

vi.mock('../hooks/useMeetingAgendaDraft', () => ({
  useMeetingAgendaDraft: vi.fn(),
}));
vi.mock('../hooks/useMeetings', () => ({
  useMeetings: vi.fn(),
}));

const useMeetingAgendaDraftMock = vi.mocked(useMeetingAgendaDraft);
const useMeetingsMock = vi.mocked(useMeetings);

describe('MeetingAgendaPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('genera un orden del día editable con entradas trazables', async () => {
    const user = userEvent.setup();
    const generate = vi.fn();
    const reset = vi.fn();
    useMeetingsMock.mockReturnValue({
      meetings: demoMeetings,
      status: 'ready',
    });
    useMeetingAgendaDraftMock.mockReturnValue({
      generate,
      reset,
      result: {
        draft: {
          title: 'Orden del día · Junta ordinaria · 18 de septiembre de 2026',
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
        meeting: demoMeetings[0]!,
        mode: 'deterministic-demo',
      },
      status: 'ready',
    });

    render(<MeetingAgendaPanel />);

    expect(screen.getByLabelText('Junta demo')).toHaveValue('meeting-ordinary-2026-09-18');
    await user.click(screen.getByRole('button', { name: 'Preparar orden del día' }));

    expect(generate).toHaveBeenCalledWith('meeting-ordinary-2026-09-18');
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

  it('permite cambiar la junta seleccionada antes de generar', async () => {
    const user = userEvent.setup();
    const generate = vi.fn();
    const reset = vi.fn();
    useMeetingsMock.mockReturnValue({
      meetings: demoMeetings,
      status: 'ready',
    });
    useMeetingAgendaDraftMock.mockReturnValue({
      generate,
      reset,
      result: undefined,
      status: 'idle',
    });

    render(<MeetingAgendaPanel />);

    await user.selectOptions(
      screen.getByLabelText('Junta demo'),
      'meeting-extraordinary-2026-10-15',
    );
    await user.click(screen.getByRole('button', { name: 'Preparar orden del día' }));

    expect(reset).toHaveBeenCalledOnce();
    expect(generate).toHaveBeenCalledWith('meeting-extraordinary-2026-10-15');
  });

  it('muestra el estado vacío del borrador generado', async () => {
    useMeetingsMock.mockReturnValue({
      meetings: demoMeetings,
      status: 'ready',
    });
    useMeetingAgendaDraftMock.mockReturnValue({
      generate: vi.fn(),
      reset: vi.fn(),
      result: {
        draft: {
          title: 'Orden del día · Junta ordinaria · 18 de septiembre de 2026',
          body: 'No hay asuntos pendientes para incluir en el orden del día.',
          items: [],
        },
        meeting: demoMeetings[0]!,
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

  it('notifica de forma accesible el error de generación', () => {
    useMeetingsMock.mockReturnValue({
      meetings: demoMeetings,
      status: 'ready',
    });
    useMeetingAgendaDraftMock.mockReturnValue({
      error: 'No se pudo preparar el orden del día.',
      generate: vi.fn(),
      reset: vi.fn(),
      result: undefined,
      status: 'error',
    });

    render(<MeetingAgendaPanel />);

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo preparar el orden del día.');
  });

  it('desactiva la generación mientras carga las juntas', () => {
    useMeetingsMock.mockReturnValue({
      meetings: [],
      status: 'loading',
    });
    useMeetingAgendaDraftMock.mockReturnValue({
      generate: vi.fn(),
      reset: vi.fn(),
      result: undefined,
      status: 'idle',
    });

    render(<MeetingAgendaPanel />);

    expect(screen.getByText('Cargando juntas demo...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preparar orden del día' })).toBeDisabled();
  });

  it('muestra error si no puede cargar juntas', () => {
    useMeetingsMock.mockReturnValue({
      error: 'No se pudieron cargar las juntas demo.',
      meetings: [],
      status: 'error',
    });
    useMeetingAgendaDraftMock.mockReturnValue({
      generate: vi.fn(),
      reset: vi.fn(),
      result: undefined,
      status: 'idle',
    });

    render(<MeetingAgendaPanel />);

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar las juntas demo.');
  });

  it('muestra estado vacío si no hay juntas disponibles', () => {
    useMeetingsMock.mockReturnValue({
      meetings: [],
      status: 'ready',
    });
    useMeetingAgendaDraftMock.mockReturnValue({
      generate: vi.fn(),
      reset: vi.fn(),
      result: undefined,
      status: 'idle',
    });

    render(<MeetingAgendaPanel />);

    expect(screen.getByText('No hay juntas demo disponibles.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preparar orden del día' })).toBeDisabled();
  });
});

const demoMeetings = [
  {
    id: 'meeting-ordinary-2026-09-18',
    kind: 'ordinaria' as const,
    title: 'Junta ordinaria',
    scheduledAt: '2026-09-18T17:00:00.000Z',
  },
  {
    id: 'meeting-extraordinary-2026-10-15',
    kind: 'extraordinaria' as const,
    title: 'Junta extraordinaria',
    scheduledAt: '2026-10-15T17:00:00.000Z',
  },
];
