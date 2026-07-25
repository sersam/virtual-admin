import { createCommunityNoticeDraft } from '../../domain/communication/CommunityNoticeDraft.js';
import type { CommunityNoticeDraftInput } from '../../domain/communication/CommunityNoticeDraft.js';
import type {
  CommunityNoticeDraftResult,
  CommunityNoticeGenerator,
} from '../../application/ports/CommunityNoticeGenerator.js';

export class DeterministicCommunityNoticeGenerator implements CommunityNoticeGenerator {
  async draft(input: CommunityNoticeDraftInput): Promise<CommunityNoticeDraftResult> {
    return {
      draft: createCommunityNoticeDraft(input),
      mode: 'deterministic-demo',
    };
  }
}
