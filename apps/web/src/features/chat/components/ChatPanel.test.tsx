import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
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
          mode: 'langgraph',
          provider: 'openai',
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

    renderChatPanel();
    await user.clear(screen.getByLabelText('Mensaje'));
    await user.type(screen.getByLabelText('Mensaje'), '¿Qué dicen las normas de la piscina?');
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }));

    expect(await screen.findByText('LangGraph')).toBeInTheDocument();
    const answerRegion = screen.getByRole('region', { name: 'Respuesta del coordinador' });
    expect(within(answerRegion).getByText('Agente de documentos')).toBeInTheDocument();
    expect(within(answerRegion).getByText('Enrutado por OpenAI')).toBeInTheDocument();
    expect(within(answerRegion).getByText('Normas de uso de zonas comunes')).toBeInTheDocument();
  });

  it('permite preparar mensajes de ejemplo para todas las áreas del MVP', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          agent: 'incidencias',
          answer: 'Soy el agente de incidencias.',
          mode: 'langgraph',
          provider: 'deterministic-demo',
          sources: [],
        }),
        { status: 200 },
      ),
    );

    renderChatPanel();

    expect(screen.getByRole('button', { name: 'Documentos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comunicados' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Incidencias' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Juntas' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Incidencias' }));
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }));

    expect(await screen.findByText('Agente de incidencias')).toBeInTheDocument();
    const [, requestOptions] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(requestOptions?.body).toBe(
      JSON.stringify({
        message: 'Hay una fuga en el garaje, clasifica la incidencia y su prioridad.',
      }),
    );
  });

  it('muestra actas generadas desde el chat coordinador', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderChatPanel();
    await user.clear(screen.getByLabelText('Mensaje'));
    await user.type(
      screen.getByLabelText('Mensaje'),
      [
        'Junta ordinaria del 12 de junio.',
        'Acuerdo: aprobar presupuesto.',
        'Tarea: Revisar contrato; Responsable: Ana',
      ].join('\n'),
    );
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }));

    expect(await screen.findByText('Agente de actas')).toBeInTheDocument();
    const answerRegion = screen.getByRole('region', { name: 'Respuesta del coordinador' });
    expect(within(answerRegion).getByText(/Acta de reunión/)).toBeInTheDocument();
    expect(within(answerRegion).getByText(/Acuerdos:/)).toBeInTheDocument();
    expect(within(answerRegion).getByText(/Revisar contrato/)).toBeInTheDocument();
  });

  it('muestra CTA solo para comunicados y navega con el asunto extraido', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          agent: 'comunicados',
          answer: 'Asunto: Corte de agua del jueves\n\nEstimados vecinos...',
          mode: 'langgraph',
          provider: 'openai',
          sources: [],
        }),
        { status: 200 },
      ),
    );

    render(
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="/chat" element={<ChatPanel />} />
          <Route path="/comunicados" element={<HandoffStatePreview />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.clear(screen.getByLabelText('Mensaje'));
    await user.type(
      screen.getByLabelText('Mensaje'),
      'Redacta un comunicado para avisar del corte de agua del jueves.',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }));
    await user.click(await screen.findByRole('button', { name: 'Continuar en Comunicados' }));

    expect(await screen.findByText('Formulario: Corte de agua del jueves')).toBeInTheDocument();
  });
});

function renderChatPanel() {
  render(
    <MemoryRouter>
      <ChatPanel />
    </MemoryRouter>,
  );
}

function HandoffStatePreview() {
  const location = useLocation();
  const state = location.state as {
    readonly communityNoticeDraftInput?: { readonly subject?: string };
  } | null;

  return <p>Formulario: {state?.communityNoticeDraftInput?.subject}</p>;
}
