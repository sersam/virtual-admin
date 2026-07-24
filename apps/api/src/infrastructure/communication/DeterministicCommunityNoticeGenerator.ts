import { createCommunityNoticeDraft } from '../../domain/communication/CommunityNoticeDraft.js';
import type {
  CommunityNoticeDraftResult,
  CommunityNoticeGenerator,
} from '../../application/ports/CommunityNoticeGenerator.js';

export class DeterministicCommunityNoticeGenerator implements CommunityNoticeGenerator {
  async draft(message: string): Promise<CommunityNoticeDraftResult> {
    return {
      draft: createCommunityNoticeDraft(message),
      mode: 'deterministic-demo',
    };
  }
}
