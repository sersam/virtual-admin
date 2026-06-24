import type { CommunityNoticeDraftResponse } from '@admin/contracts';
import { createCommunityNoticeDraft } from '../../domain/communication/CommunityNoticeDraft.js';

export class DraftCommunityNotice {
  async execute(message: string): Promise<CommunityNoticeDraftResponse> {
    return {
      draft: createCommunityNoticeDraft(message),
      mode: 'deterministic-demo',
    };
  }
}
