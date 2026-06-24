import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UploadedDocumentManager } from './UploadedDocumentManager';

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

describe('UploadedDocumentManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra PDFs subidos en la sesión', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ documents: [uploadedDocument] }), { status: 200 }),
    );

    render(<UploadedDocumentManager />);

    expect(
      await screen.findByRole('heading', { name: 'PDFs subidos en esta sesión' }),
    ).toBeVisible();
    expect(screen.getByText('presupuesto ascensor')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir PDF subido' })).toHaveAttribute(
      'href',
      uploadedDocument.documentUrl,
    );
  });

  it('permite subir varios PDFs desde el selector', async () => {
    const user = userEvent.setup();
    const uploadResponses = [uploadedDocument, secondUploadedDocument];
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ documents: [] }), { status: 200 }))
      .mockImplementation(async () => {
        return new Response(JSON.stringify({ document: uploadResponses.shift() }), { status: 201 });
      });

    render(<UploadedDocumentManager />);
    await screen.findByText('No hay PDFs subidos en esta sesión.');
    await user.upload(screen.getByLabelText('Subir PDFs'), [
      new File(['pdf'], 'presupuesto-ascensor.pdf', { type: 'application/pdf' }),
      new File(['pdf'], 'factura-jardines.pdf', { type: 'application/pdf' }),
    ]);

    await waitFor(() => expect(screen.getByText('presupuesto ascensor')).toBeInTheDocument());
    expect(screen.getByText('factura jardines')).toBeInTheDocument();
  });
});
