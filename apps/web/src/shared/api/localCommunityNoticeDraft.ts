import { createCommunityNoticeDraft } from '@admin/community-notices';
import type { CommunityNoticeDraftResponse } from '@admin/contracts';

export function createLocalCommunityNoticeDraft(message: string): CommunityNoticeDraftResponse {
  return {
    draft: createCommunityNoticeDraft(message),
    mode: 'deterministic-demo',
  };
}
