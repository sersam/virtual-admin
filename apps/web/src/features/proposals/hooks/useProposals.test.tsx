import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useProposals } from './useProposals';

const proposal = {
  id: 'proposal-0001',
  description: 'Instalar aparcabicis en el patio interior.',
  createdAt: '2026-07-26T10:00:00.000Z',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

describe('useProposals', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carga propuestas al inicializar', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ proposals: [proposal] }), { status: 200 }),
    );

    const { result } = renderHook(() => useProposals());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.proposals).toEqual([proposal]);
  });

  it('mantiene formulario disponible si falla la carga inicial', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => useProposals());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.proposals).toEqual([]);
    expect(result.current.error).toBe('No se pudieron cargar las propuestas.');
  });

  it('crea propuestas y las añade al principio', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ proposals: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ proposal }), { status: 201 }));
    const { result } = renderHook(() => useProposals());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const created = await act(() =>
      result.current.create('Instalar aparcabicis en el patio interior.'),
    );

    expect(created).toEqual(proposal);
    expect(result.current.status).toBe('ready');
    expect(result.current.proposals).toEqual([proposal]);
    expect(result.current.successMessage).toBe('Propuesta registrada.');
  });

  it('valida descripciones antes de llamar a la API', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ proposals: [] }), { status: 200 }));
    const { result } = renderHook(() => useProposals());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const created = await act(() => result.current.create('corta'));

    expect(created).toBeUndefined();
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('entre 10 y 1000 caracteres');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('ignora dobles envios mientras hay un alta en curso', async () => {
    const creation = deferred<Response>();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ proposals: [] }), { status: 200 }))
      .mockReturnValueOnce(creation.promise);
    const { result } = renderHook(() => useProposals());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let firstCreate: Promise<typeof proposal | undefined> = Promise.resolve(undefined);
    await act(async () => {
      firstCreate = result.current.create('Instalar aparcabicis en el patio interior.');
    });
    await act(() => result.current.create('Crear una zona de compostaje comunitario.'));

    expect(result.current.status).toBe('creating');
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
      creation.resolve(new Response(JSON.stringify({ proposal }), { status: 201 }));
      await firstCreate;
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.proposals).toEqual([proposal]);
  });

  it('conserva el listado si falla el alta', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ proposals: [proposal] }), { status: 200 }),
      )
      .mockRejectedValueOnce(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useProposals());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const created = await act(() =>
      result.current.create('Crear una zona de compostaje comunitario.'),
    );

    expect(created).toBeUndefined();
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('No se pudo registrar la propuesta. Inténtalo de nuevo.');
    expect(result.current.proposals).toEqual([proposal]);
  });

  it('muestra mensajes de error propagados por la API', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ proposals: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'SESSION_LIMIT_REACHED',
              message: 'Has alcanzado el límite de uso de esta sesión demo.',
            },
          }),
          { status: 429 },
        ),
      );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useProposals());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() => result.current.create('Crear una zona de compostaje comunitario.'));

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Has alcanzado el límite de uso de esta sesión demo.');
  });
});
