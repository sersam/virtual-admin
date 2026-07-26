import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MeetingAgendaPanel } from './MeetingAgendaPanel';
import { useMeetingAgendaDraft } from '../hooks/useMeetingAgendaDraft';
import { useMeetings } from '../hooks/useMeetings';
import { useProposals } from '../../proposals/hooks/useProposals';

vi.mock('../hooks/useMeetingAgendaDraft', () => ({
  useMeetingAgendaDraft: vi.fn(),
}));
vi.mock('../hooks/useMeetings', () => ({
  useMeetings: vi.fn(),
}));
vi.mock('../../proposals/hooks/useProposals', () => ({
  useProposals: vi.fn(),
}));

const useMeetingAgendaDraftMock = vi.mocked(useMeetingAgendaDraft);
const useMeetingsMock = vi.mocked(useMeetings);
const useProposalsMock = vi.mocked(useProposals);

describe('MeetingAgendaPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    useProposalsMock.mockReturnValue({
      create: vi.fn(),
      proposals: [],
      status: 'ready',
    });
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
            {
              description: 'Instalar aparcabicis en el patio interior.',
              sourceType: 'proposal',
              sourceId: 'proposal-1',
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
    expect(screen.getByText('Instalar aparcabicis en el patio interior.')).toBeInTheDocument();
    expect(screen.getByText('Incidencia')).toBeInTheDocument();
    expect(screen.getByText('Acuerdo pendiente')).toBeInTheDocument();
    expect(screen.getByText('Propuesta vecinal')).toBeInTheDocument();
    expect(screen.getByText('proposal-1')).toBeInTheDocument();

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

  it('lista propuestas y muestra sus fechas en español', () => {
    useMeetingsMock.mockReturnValue({
      meetings: demoMeetings,
      status: 'ready',
    });
    useMeetingAgendaDraftMock.mockReturnValue({
      generate: vi.fn(),
      reset: vi.fn(),
      result: undefined,
      status: 'idle',
    });
    useProposalsMock.mockReturnValue({
      create: vi.fn(),
      proposals: [
        {
          id: 'proposal-1',
          description: 'Instalar aparcabicis en el patio interior.',
          createdAt: '2026-07-26T10:00:00.000Z',
        },
      ],
      status: 'ready',
    });

    render(<MeetingAgendaPanel />);

    expect(screen.getByText('Propuestas vecinales')).toBeInTheDocument();
    expect(screen.getByText('Instalar aparcabicis en el patio interior.')).toBeInTheDocument();
    expect(screen.getByText(/^26 jul\.? 2026, 12:00$/)).toBeInTheDocument();
  });

  it('registra una propuesta, limpia el campo e invalida el borrador visible', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    const create = vi.fn().mockResolvedValue({
      id: 'proposal-2',
      description: 'Crear una zona de compostaje comunitario.',
      createdAt: '2026-07-26T11:00:00.000Z',
    });
    useMeetingsMock.mockReturnValue({
      meetings: demoMeetings,
      status: 'ready',
    });
    useMeetingAgendaDraftMock.mockReturnValue({
      generate: vi.fn(),
      reset,
      result: {
        draft: {
          title: 'Orden del día · Junta ordinaria · 18 de septiembre de 2026',
          body: 'Orden del día\n\n1. [Alta] Revisar contrato.',
          items: [],
        },
        meeting: demoMeetings[0]!,
        mode: 'deterministic-demo',
      },
      status: 'ready',
    });
    useProposalsMock.mockReturnValue({
      create,
      proposals: [],
      status: 'ready',
      successMessage: 'Propuesta registrada.',
    });

    render(<MeetingAgendaPanel />);

    await user.type(
      screen.getByLabelText('Descripción de la propuesta'),
      'Crear una zona de compostaje comunitario.',
    );
    await user.click(screen.getByRole('button', { name: 'Registrar propuesta' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith('Crear una zona de compostaje comunitario.'),
    );
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Descripción de la propuesta')).toHaveValue('');
    expect(screen.queryByLabelText('Borrador editable del orden del día')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Propuesta registrada.');
  });

  it('conserva el texto si falla el alta y mantiene disponible el formulario tras fallo de carga', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue(undefined);
    useMeetingsMock.mockReturnValue({
      meetings: demoMeetings,
      status: 'ready',
    });
    useMeetingAgendaDraftMock.mockReturnValue({
      generate: vi.fn(),
      reset: vi.fn(),
      result: undefined,
      status: 'idle',
    });
    useProposalsMock.mockReturnValue({
      create,
      error: 'No se pudieron cargar las propuestas.',
      proposals: [],
      status: 'error',
    });

    render(<MeetingAgendaPanel />);

    const textarea = screen.getByLabelText('Descripción de la propuesta');
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar las propuestas.');
    expect(textarea).toHaveAttribute(
      'aria-describedby',
      'proposal-description-help proposal-description-error',
    );
    expect(textarea).toBeEnabled();

    await user.type(textarea, 'Crear una zona de compostaje comunitario.');
    await user.click(screen.getByRole('button', { name: 'Registrar propuesta' }));

    expect(textarea).toHaveValue('Crear una zona de compostaje comunitario.');
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
