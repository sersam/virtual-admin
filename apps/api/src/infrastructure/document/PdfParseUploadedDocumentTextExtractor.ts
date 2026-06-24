import { PDFParse } from 'pdf-parse';
import type { UploadedDocumentTextExtractor } from '../../application/ports/UploadedDocumentTextExtractor.js';

export class PdfParseUploadedDocumentTextExtractor implements UploadedDocumentTextExtractor {
  async extractText(content: Uint8Array): Promise<string> {
    const parser = new PDFParse({ data: content });
    try {
      const result = await parser.getText();

      return result.text.replaceAll(/\s+/g, ' ').trim();
    } finally {
      await parser.destroy();
    }
  }
}
