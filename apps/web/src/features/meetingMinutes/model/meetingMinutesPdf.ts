import { createTextPdfBlob, downloadTextPdf } from '../../../shared/model/textPdf';

interface MeetingMinutesPdfInput {
  readonly body: string;
  readonly title: string;
}

const PDF_FILENAME = 'acta-reunion.pdf';

export function createMeetingMinutesPdfBlob(input: MeetingMinutesPdfInput): Blob {
  return createTextPdfBlob(input);
}

export function downloadMeetingMinutesPdf(input: MeetingMinutesPdfInput): void {
  downloadTextPdf({ ...input, filename: PDF_FILENAME });
}
