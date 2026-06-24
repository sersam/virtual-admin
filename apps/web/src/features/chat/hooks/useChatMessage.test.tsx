import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useChatMessage } from './useChatMessage';

describe('useChatMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publica respuestas del coordinador', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          agent: 'general',
          answer: 'Puedo derivar peticiones de la comunidad.',
          mode: 'langgraph-demo',
          sources: [],
        }),
        { status: 200 },
      ),
    );
    const { result } = renderHook(() => useChatMessage());

    await act(() => result.current.submit('Hola, ¿qué puedes hacer?'));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.result?.agent).toBe('general');
  });

  it('usa fallback local si la API no está disponible', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useChatMessage());

    await act(() => result.current.submit('Hay una fuga urgente en el garaje.'));

    await waitFor(() => expect(result.current.status).toBe('fallback'));
    expect(result.current.result?.agent).toBe('incidencias');
  });

  it('valida mensajes demasiado cortos', async () => {
    const { result } = renderHook(() => useChatMessage());

    await act(() => result.current.submit('ok'));

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('entre 3 y 500 caracteres');
  });
});
