export interface UploadedCommunityDocument {
  readonly id: string;
  readonly sessionId: string;
  readonly title: string;
  readonly filename: string;
  readonly contentType: 'application/pdf';
  readonly sizeBytes: number;
  readonly uploadedAt: Date;
  readonly documentUrl: string;
  readonly content: Uint8Array;
  readonly textContent: string;
}
