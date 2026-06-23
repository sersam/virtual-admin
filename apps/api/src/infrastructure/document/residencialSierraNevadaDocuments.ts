import { demoCommunityDocuments } from '@admin/contracts';
import type { CommunityDocument } from '../../domain/document/CommunityDocument.js';

export const residencialSierraNevadaDocuments: CommunityDocument[] = demoCommunityDocuments.map(
  (document) => ({ ...document }),
);
