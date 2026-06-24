import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatPanel } from './ChatPanel';

describe('ChatPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envía un mensaje y muestra agente, modo y fuentes', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          agent: 'documentos',
          answer: 'La piscina abre de 10:00 a 21:00.',
          mode: 'langgraph-demo',
          sources: [
            {
              id: 'normas-piscina',
              title: 'Normas de uso de zonas comunes',
              type: 'normas',
              section: 'Piscina',
              excerpt: 'La piscina comunitaria abre de 10:00 a 21:00.',
              documentUrl: '/documents/normas-zonas-comunes.pdf',
              score: 0.9,
            },
          ],
        }),
        { status: 200 },
      ),
    );

    render(<ChatPanel />);
    await user.clear(screen.getByLabelText('Mensaje'));
    await user.type(screen.getByLabelText('Mensaje'), '¿Qué dicen las normas de la piscina?');
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }));

    await waitFor(() => expect(screen.getByText('LangGraph demo')).toBeInTheDocument());
    const answerRegion = screen.getByRole('region', { name: 'Respuesta del coordinador' });
    expect(within(answerRegion).getByText('Agente de documentos')).toBeInTheDocument();
    expect(within(answerRegion).getByText('Normas de uso de zonas comunes')).toBeInTheDocument();
  });

  it('permite preparar mensajes de ejemplo para todas las áreas del MVP', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          agent: 'incidencias',
          answer: 'Soy el agente de incidencias.',
          mode: 'langgraph-demo',
          sources: [],
        }),
        { status: 200 },
      ),
    );

    render(<ChatPanel />);

    expect(screen.getByRole('button', { name: 'Documentos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comunicados' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Incidencias' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Juntas' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Incidencias' }));
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }));

    await waitFor(() => expect(screen.getByText('Agente de incidencias')).toBeInTheDocument());
    const [, requestOptions] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(requestOptions?.body).toBe(
      JSON.stringify({
        message: 'Hay una fuga en el garaje, clasifica la incidencia y su prioridad.',
      }),
    );
  });
});
