import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUploadedDocuments } from './useUploadedDocuments';

const uploadedDocument = {
  id: 'pdf-0001',
  title: 'presupuesto ascensor',
  type: 'adjunto',
  filename: 'presupuesto-ascensor.pdf',
  sizeBytes: 1024,
  uploadedAt: '2026-06-24T08:00:00.000Z',
  documentUrl: '/api/documents/uploads/pdf-0001/presupuesto-ascensor.pdf',
};
const secondUploadedDocument = {
  ...uploadedDocument,
  id: 'pdf-0002',
  filename: 'factura-jardines.pdf',
  title: 'factura jardines',
  documentUrl: '/api/documents/uploads/pdf-0002/factura-jardines.pdf',
};

describe('useUploadedDocuments', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carga PDFs de sesión al inicializar', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ documents: [uploadedDocument] }), { status: 200 }),
    );

    const { result } = renderHook(() => useUploadedDocuments());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.documents).toEqual([uploadedDocument]);
  });

  it('sube varios PDFs y refresca el listado local', async () => {
    const uploadResponses = [uploadedDocument, secondUploadedDocument];
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ documents: [] }), { status: 200 }))
      .mockImplementation(async () => {
        return new Response(JSON.stringify({ document: uploadResponses.shift() }), { status: 201 });
      });
    const { result } = renderHook(() => useUploadedDocuments());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() =>
      result.current.upload([
        new File(['pdf'], 'presupuesto-ascensor.pdf', { type: 'application/pdf' }),
        new File(['pdf'], 'factura-jardines.pdf', { type: 'application/pdf' }),
      ]),
    );

    expect(result.current.documents).toEqual([uploadedDocument, secondUploadedDocument]);
  });

  it('acepta PDFs con extensión en mayúsculas antes de llamar a la API', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ documents: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ document: uploadedDocument }), { status: 201 }),
      );
    const { result } = renderHook(() => useUploadedDocuments());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() =>
      result.current.upload([
        new File(['pdf'], 'PRESUPUESTO-ASCENSOR.PDF', { type: 'application/pdf' }),
      ]),
    );

    expect(result.current.status).toBe('ready');
    expect(result.current.documents).toEqual([uploadedDocument]);
  });

  it('mantiene los PDFs subidos cuando una subida múltiple falla parcialmente', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ documents: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ document: uploadedDocument }), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR' } }), { status: 500 }),
      );
    const { result } = renderHook(() => useUploadedDocuments());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() =>
      result.current.upload([
        new File(['pdf'], 'presupuesto-ascensor.pdf', { type: 'application/pdf' }),
        new File(['pdf'], 'factura-jardines.pdf', { type: 'application/pdf' }),
      ]),
    );

    expect(result.current.status).toBe('error');
    expect(result.current.documents).toEqual([uploadedDocument]);
    expect(result.current.error).toContain('factura-jardines.pdf');
  });

  it('rechaza archivos que no son PDF antes de llamar a la API', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ documents: [] }), { status: 200 }));
    const { result } = renderHook(() => useUploadedDocuments());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() =>
      result.current.upload([new File(['texto'], 'notas.txt', { type: 'text/plain' })]),
    );

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('solo pueden ser PDF');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('rechaza PDFs de más de 5 MB antes de llamar a la API', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ documents: [] }), { status: 200 }));
    const { result } = renderHook(() => useUploadedDocuments());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() =>
      result.current.upload([
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.pdf', {
          type: 'application/pdf',
        }),
      ]),
    );

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('5 MB');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
