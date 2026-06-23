import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDocumentQuery } from './useDocumentQuery';

describe('useDocumentQuery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publica respuestas de la API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          answer: 'La piscina abre de 10:00 a 21:00.',
          mode: 'lexical-demo',
          sources: [
            {
              id: 'normas-piscina',
              title: 'Normas',
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
    const { result } = renderHook(() => useDocumentQuery());

    await act(() => result.current.submit('horario piscina'));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.result?.sources[0]?.id).toBe('normas-piscina');
  });

  it('usa fallback local si la API no está disponible', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useDocumentQuery());

    await act(() => result.current.submit('ascensor portal B'));

    await waitFor(() => expect(result.current.status).toBe('fallback'));
    expect(result.current.result?.sources[0]?.id).toBe('acta-ascensor');
  });

  it('valida consultas demasiado cortas', async () => {
    const { result } = renderHook(() => useDocumentQuery());

    await act(() => result.current.submit('  '));

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('entre 3 y 300 caracteres');
  });

  it('rechaza consultas demasiado largas sin activar fallback', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useDocumentQuery());

    await act(() => result.current.submit('a'.repeat(301)));

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('entre 3 y 300 caracteres');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
