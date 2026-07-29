import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MeetingMinutesPanel } from './MeetingMinutesPanel';

describe('MeetingMinutesPanel', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
            agreements: ['Aprobar presupuesto.'],
            tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
          },
          mode: 'openai',
        }),
        { status: 200 },
      ),
    );

    render(<MeetingMinutesPanel />);

    await user.clear(screen.getByLabelText('Notas de la reunión'));
    await user.type(screen.getByLabelText('Notas de la reunión'), 'Acuerdo: aprobar presupuesto.');
    await user.click(screen.getByRole('button', { name: 'Generar acta' }));

    expect(await screen.findByText('Acta de reunión')).toBeInTheDocument();
    expect(await screen.findByDisplayValue(/Acuerdos:/)).toBeInTheDocument();
    expect(screen.getByText('Acuerdos detectados')).toBeInTheDocument();
    expect(screen.getByText('Aprobar presupuesto.')).toBeInTheDocument();
    expect(screen.getByText('Revisar contrato')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText(/OpenAI/)).toBeInTheDocument();
  });

  it('permite editar el contenido del acta generada', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          draft: {
            title: 'Acta de reunión',
            body: 'Acta de reunión\n\nAcuerdos:\n- Aprobar presupuesto.',
            agreements: ['Aprobar presupuesto.'],
            tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
          },
          mode: 'deterministic-demo',
        }),
        { status: 200 },
      ),
    );

    render(<MeetingMinutesPanel />);

    await user.click(screen.getByRole('button', { name: 'Generar acta' }));
    const editableDraft = await screen.findByLabelText('Borrador editable del acta');

    fireEvent.change(editableDraft, { target: { value: 'Acta revisada por secretaría.' } });

    expect(editableDraft).toHaveValue('Acta revisada por secretaría.');
    expect(screen.getByText('Revisar contrato')).toBeInTheDocument();
  });

  it('muestra estados vacios cuando no detecta acuerdos ni tareas', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          draft: {
            title: 'Acta de reunión',
            body: 'Acta de reunión\n\nNo se indican acuerdos ni tareas.',
            agreements: [],
            tasks: [],
          },
          mode: 'deterministic-demo',
        }),
        { status: 200 },
      ),
    );

    render(<MeetingMinutesPanel />);

    await user.click(screen.getByRole('button', { name: 'Generar acta' }));

    expect(await screen.findByText('No se han detectado acuerdos.')).toBeInTheDocument();
    expect(screen.getByText('No se han detectado tareas.')).toBeInTheDocument();
  });

  it('descarga un PDF con el borrador editado', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          draft: {
            title: 'Acta de reunión',
            body: 'Acta de reunión\n\nAcuerdos:\n- Aprobar presupuesto.',
            agreements: ['Aprobar presupuesto.'],
            tasks: [],
          },
          mode: 'deterministic-demo',
        }),
        { status: 200 },
      ),
    );
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const createObjectUrlSpy = vi.fn((blob: Blob) => {
      expect(blob.type).toBe('application/pdf');
      return 'blob:acta';
    });
    const revokeObjectUrlSpy = vi.fn();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectUrlSpy,
      revokeObjectURL: revokeObjectUrlSpy,
    });

    render(<MeetingMinutesPanel />);

    await user.click(screen.getByRole('button', { name: 'Generar acta' }));
    const editableDraft = await screen.findByLabelText('Borrador editable del acta');
    fireEvent.change(editableDraft, { target: { value: 'Acta revisada por secretaría.' } });
    await user.click(screen.getByRole('button', { name: 'Descargar PDF' }));

    expect(createObjectUrlSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalled();
    await waitFor(() => expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:acta'));
  });
});
