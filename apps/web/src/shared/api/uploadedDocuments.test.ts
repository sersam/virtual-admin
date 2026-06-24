import { afterEach, describe, expect, it, vi } from 'vitest';
import { PartialUploadError, listUploadedDocuments, uploadPdfDocuments } from './uploadedDocuments';

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

describe('uploadedDocuments api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista PDFs subidos en la sesión', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ documents: [uploadedDocument] }), { status: 200 }),
    );

    await expect(listUploadedDocuments()).resolves.toEqual([uploadedDocument]);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/documents/uploads',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('sube varios PDFs de sesión usando multipart/form-data', async () => {
    const uploadResponses = [uploadedDocument, secondUploadedDocument];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify({ document: uploadResponses.shift() }), { status: 201 });
    });
    const files = [
      new File(['pdf'], 'presupuesto-ascensor.pdf', { type: 'application/pdf' }),
      new File(['pdf'], 'factura-jardines.pdf', { type: 'application/pdf' }),
    ];

    const documents = await uploadPdfDocuments(files);

    expect(documents).toEqual([uploadedDocument, secondUploadedDocument]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    const [, firstOptions] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(firstOptions).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(firstOptions?.body).toBeInstanceOf(FormData);
  });

  it('conserva los PDFs subidos antes de un fallo parcial', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ document: uploadedDocument }), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR' } }), { status: 500 }),
      );
    const files = [
      new File(['pdf'], 'presupuesto-ascensor.pdf', { type: 'application/pdf' }),
      new File(['pdf'], 'factura-jardines.pdf', { type: 'application/pdf' }),
    ];

    const promise = uploadPdfDocuments(files);

    await expect(promise).rejects.toBeInstanceOf(PartialUploadError);
    await expect(promise).rejects.toMatchObject({
      failedFilenames: ['factura-jardines.pdf'],
      uploadedDocuments: [uploadedDocument],
    });
  });

  it('rechaza respuestas inválidas', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ documents: [{ ...uploadedDocument, documentUrl: '/tmp/a.txt' }] }),
        {
          status: 200,
        },
      ),
    );

    await expect(listUploadedDocuments()).rejects.toThrow();
  });
});
