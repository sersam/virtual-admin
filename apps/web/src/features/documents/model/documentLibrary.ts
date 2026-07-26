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
  adjunto: 'Adjunto',
  contrato: 'Contrato',
  comunicado: 'Comunicado',
  estatutos: 'Estatutos',
  normas: 'Normas',
  presupuesto: 'Presupuesto',
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
