import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocumentQueryPanel } from './DocumentQueryPanel';

describe('DocumentQueryPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('consulta documentos y muestra respuesta con fuentes', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ documents: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            answer: 'La piscina abre de 10:00 a 21:00.',
            mode: 'lexical-demo',
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

    render(<DocumentQueryPanel />);
    await user.click(screen.getByRole('button', { name: 'Consultar documentación' }));

    await waitFor(() => expect(screen.getByText('API RAG léxica')).toBeInTheDocument());
    const answerRegion = screen.getByRole('region', { name: 'Fuentes recuperadas' });
    expect(within(answerRegion).getByText('Normas de uso de zonas comunes')).toBeInTheDocument();
    expect(within(answerRegion).getByRole('link', { name: 'Abrir PDF completo' })).toHaveAttribute(
      'href',
      '/documents/normas-zonas-comunes.pdf',
    );
  });

  it('muestra la biblioteca de PDFs sin consultar', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ documents: [] }), { status: 200 }),
    );

    render(<DocumentQueryPanel />);

    expect(screen.getByRole('heading', { name: 'Documentos disponibles' })).toBeInTheDocument();
    expect(screen.getByText('Contrato de mantenimiento de jardines')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'PDFs subidos en esta sesión' }),
    ).toBeInTheDocument();
  });

  it('muestra fallback local con fuentes cuando falla la API', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<DocumentQueryPanel />);
    await user.click(screen.getByRole('button', { name: 'Consultar documentación' }));

    await waitFor(() => expect(screen.getByText('Modo demo local')).toBeInTheDocument());
    const answerRegion = screen.getByRole('region', { name: 'Fuentes recuperadas' });
    expect(within(answerRegion).getByText('Normas de uso de zonas comunes')).toBeInTheDocument();
  });
});
