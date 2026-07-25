import { createCommunityNoticeDraft } from '@admin/community-notices';

import {
  CommunityNoticeDraftRequestSchema,
  type CommunityNoticeDraftRequest,
  type CommunityNoticeDraftResponse,
} from '@admin/contracts';

export function createLocalCommunityNoticeDraft(
  input: CommunityNoticeDraftRequest,
): CommunityNoticeDraftResponse {
  const payload = CommunityNoticeDraftRequestSchema.parse(input);
  return {
    draft: createCommunityNoticeDraft(payload),
    mode: 'deterministic-demo',
  };
}
