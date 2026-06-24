import type { UploadedDocumentTextExtractor } from '../../application/ports/UploadedDocumentTextExtractor.js';

export class PdfParseUploadedDocumentTextExtractor implements UploadedDocumentTextExtractor {
  async extractText(content: Uint8Array): Promise<string> {
    await ensurePdfJsNodePolyfills();
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: content });
    try {
      const result = await parser.getText();

      return result.text.replaceAll(/\s+/g, ' ').trim();
    } finally {
      await parser.destroy();
    }
  }
}

async function ensurePdfJsNodePolyfills(): Promise<void> {
  const globalScope = globalThis as Record<string, unknown>;
  if (globalScope.DOMMatrix && globalScope.ImageData && globalScope.Path2D) return;

  const { DOMMatrix, ImageData, Path2D } = await import('@napi-rs/canvas');
  globalScope.DOMMatrix ??= DOMMatrix;
  globalScope.ImageData ??= ImageData;
  globalScope.Path2D ??= Path2D;
}
