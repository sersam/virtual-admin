export type CommunityDocumentType = 'estatutos' | 'normas' | 'acta' | 'contrato';

export interface CommunityDocument {
  readonly id: string;
  readonly title: string;
  readonly type: CommunityDocumentType;
  readonly section: string;
  readonly content: string;
  readonly documentUrl: string;
}

export interface RetrievedDocument extends CommunityDocument {
  readonly score: number;
}

export function buildDocumentExcerpt(document: CommunityDocument, maxLength = 220): string {
  const normalizedContent = document.content.replaceAll(/\s+/g, ' ').trim();
  if (normalizedContent.length <= maxLength) return normalizedContent;
  return `${normalizedContent.slice(0, maxLength - 1).trim()}…`;
}
