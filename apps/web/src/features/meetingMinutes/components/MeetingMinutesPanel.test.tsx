import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MeetingMinutesPanel } from './MeetingMinutesPanel';

describe('MeetingMinutesPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacta y muestra un acta con tareas detectadas', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          draft: {
            title: 'Acta de reunión',
            body: 'Acta de reunión\n\nAcuerdos:\n- Aprobar presupuesto.',
            tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
          },
          mode: 'deterministic-demo',
        }),
        { status: 200 },
      ),
    );

    render(<MeetingMinutesPanel />);

    await user.clear(screen.getByLabelText('Notas de la reunión'));
    await user.type(screen.getByLabelText('Notas de la reunión'), 'Acuerdo: aprobar presupuesto.');
    await user.click(screen.getByRole('button', { name: 'Generar acta' }));

    await waitFor(() => expect(screen.getByText('Acta de reunión')).toBeInTheDocument());
    expect(screen.getByText(/Acuerdos:/)).toBeInTheDocument();
    expect(screen.getByText('Revisar contrato')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Demo determinista')).toBeInTheDocument();
  });
});
