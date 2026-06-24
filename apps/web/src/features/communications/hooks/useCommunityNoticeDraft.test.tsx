import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCommunityNoticeDraft } from './useCommunityNoticeDraft';

describe('useCommunityNoticeDraft', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publica borradores generados por la API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          draft: {
            subject: 'Corte de agua',
            body: 'Estimados vecinos:\n\nLes informamos sobre el corte de agua.',
          },
          mode: 'deterministic-demo',
        }),
        { status: 200 },
      ),
    );
    const { result } = renderHook(() => useCommunityNoticeDraft());

    await act(() => result.current.submit('Redacta un comunicado sobre el corte de agua.'));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.result?.draft.subject).toBe('Corte de agua');
  });

  it('usa borrador local si la API no está disponible', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useCommunityNoticeDraft());

    await act(() => result.current.submit('Redacta un comunicado sobre la limpieza del garaje.'));

    await waitFor(() => expect(result.current.status).toBe('fallback'));
    expect(result.current.result?.draft.subject).toBe('Limpieza del garaje');
  });

  it('valida mensajes demasiado cortos', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useCommunityNoticeDraft());

    await act(() => result.current.submit('ok'));

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('entre 3 y 500 caracteres');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
