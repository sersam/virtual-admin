import { createCommunityNoticeDraft } from '@admin/community-notices';

import {
  CommunityNoticeDraftRequestSchema,
  type CommunityNoticeDraftResponse,
} from '@admin/contracts';

export function createLocalCommunityNoticeDraft(message: string): CommunityNoticeDraftResponse {
  const payload = CommunityNoticeDraftRequestSchema.parse({ message });
  return {
    draft: createCommunityNoticeDraft(payload.message),
    mode: 'deterministic-demo',
  };
}
