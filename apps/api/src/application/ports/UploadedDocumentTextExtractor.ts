export interface UploadedDocumentTextExtractor {
  extractText(content: Uint8Array): Promise<string>;
}
