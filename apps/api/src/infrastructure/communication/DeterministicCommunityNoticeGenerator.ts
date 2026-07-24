import type { CommunityNoticeDraftResponse } from '@admin/contracts';
import { createCommunityNoticeDraft } from '../../domain/communication/CommunityNoticeDraft.js';
import type { CommunityNoticeGenerator } from '../../application/ports/CommunityNoticeGenerator.js';

export class DeterministicCommunityNoticeGenerator implements CommunityNoticeGenerator {
  async draft(message: string): Promise<CommunityNoticeDraftResponse> {
    return {
      draft: createCommunityNoticeDraft(message),
      mode: 'deterministic-demo',
    };
  }
}
