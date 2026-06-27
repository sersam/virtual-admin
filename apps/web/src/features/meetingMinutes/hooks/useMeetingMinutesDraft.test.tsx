import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMeetingMinutesDraft } from './useMeetingMinutesDraft';

describe('useMeetingMinutesDraft', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publica borradores generados por la API', async () => {
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
    const { result } = renderHook(() => useMeetingMinutesDraft());

    await act(() => result.current.submit('Acuerdo: aprobar presupuesto.'));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.result?.draft.title).toBe('Acta de reunión');
  });

  it('usa borrador local si la API no está disponible', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useMeetingMinutesDraft());

    await act(() =>
      result.current.submit(
        [
          'Junta ordinaria del 12 de junio.',
          'Acuerdo: aprobar presupuesto.',
          'Tarea: Revisar contrato; Responsable: Ana',
        ].join('\n'),
      ),
    );

    await waitFor(() => expect(result.current.status).toBe('fallback'));
    expect(result.current.result?.draft.tasks).toEqual([
      { description: 'Revisar contrato', assignee: 'Ana' },
    ]);
  });

  it('valida notas demasiado cortas', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useMeetingMinutesDraft());

    await act(() => result.current.submit('Acta'));

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('entre 10 y 4000 caracteres');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('ignora respuestas obsoletas de envíos anteriores', async () => {
    const firstRequest = createDeferredResponse();
    const secondRequest = createDeferredResponse();
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const { result } = renderHook(() => useMeetingMinutesDraft());

    await act(async () => {
      void result.current.submit('Acuerdo: aprobar presupuesto antiguo.');
    });
    await act(async () => {
      void result.current.submit('Acuerdo: aprobar presupuesto nuevo.');
    });

    await act(async () => {
      secondRequest.resolve(createDraftResponse('Acta nueva'));
      await secondRequest.promise;
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.result?.draft.title).toBe('Acta nueva');

    await act(async () => {
      firstRequest.resolve(createDraftResponse('Acta antigua'));
      await firstRequest.promise;
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.result?.draft.title).toBe('Acta nueva');
  });

  it('ignora fallbacks obsoletos de envíos anteriores', async () => {
    const firstRequest = createDeferredResponse();
    const secondRequest = createDeferredResponse();
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useMeetingMinutesDraft());

    await act(async () => {
      void result.current.submit('Acuerdo: revisar contrato antiguo.');
    });
    await act(async () => {
      void result.current.submit('Acuerdo: revisar contrato nuevo.');
    });

    await act(async () => {
      secondRequest.resolve(createDraftResponse('Acta nueva'));
      await secondRequest.promise;
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      firstRequest.reject(new Error('network'));
      await firstRequest.promise.catch(() => undefined);
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.result?.draft.title).toBe('Acta nueva');
  });
});

function createDraftResponse(title: string): Response {
  return new Response(
    JSON.stringify({
      draft: {
        title,
        body: `${title}\n\nAcuerdos:\n- Aprobar presupuesto.`,
        tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
      },
      mode: 'deterministic-demo',
    }),
    { status: 200 },
  );
}

function createDeferredResponse(): {
  readonly promise: Promise<Response>;
  readonly reject: (error: Error) => void;
  readonly resolve: (response: Response) => void;
} {
  let reject!: (error: Error) => void;
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}
