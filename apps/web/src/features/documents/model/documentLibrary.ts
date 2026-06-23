import { demoCommunityDocuments, type DocumentSource } from '@admin/contracts';

export interface LibraryDocument {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly section: string;
  readonly documentUrl: string;
}

const documentTypeLabels: Record<DocumentSource['type'], string> = {
  acta: 'Acta',
  contrato: 'Contrato',
  estatutos: 'Estatutos',
  normas: 'Normas',
};

export const documentLibrary: LibraryDocument[] = demoCommunityDocuments.map(
  ({ id, title, type, section, documentUrl }) => ({
    id,
    title,
    type: documentTypeLabels[type],
    section,
    documentUrl,
  }),
);
