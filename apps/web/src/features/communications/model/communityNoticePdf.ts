import { createTextPdfBlob, downloadTextPdf } from '../../../shared/model/textPdf';

interface CommunityNoticePdfInput {
  readonly body: string;
  readonly subject: string;
}

const PDF_FILENAME = 'comunicado.pdf';

export function createCommunityNoticePdfBlob(input: CommunityNoticePdfInput): Blob {
  return createTextPdfBlob({ body: input.body, title: input.subject });
}

export function downloadCommunityNoticePdf(input: CommunityNoticePdfInput): void {
  downloadTextPdf({ body: input.body, filename: PDF_FILENAME, title: input.subject });
}
