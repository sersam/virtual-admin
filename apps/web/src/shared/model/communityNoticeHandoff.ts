import { buildCommunityNoticeInputFromText } from '@admin/community-notices';
import {
  CommunityNoticeDraftRequestSchema,
  type CommunityNoticeDraftRequest,
} from '@admin/contracts';
import { z } from 'zod';

const CommunityNoticeHandoffStateSchema = z.object({
  communityNoticeDraftInput: CommunityNoticeDraftRequestSchema,
});

export function createCommunityNoticeHandoffState(message: string) {
  return {
    communityNoticeDraftInput: CommunityNoticeDraftRequestSchema.parse(
      buildCommunityNoticeInputFromText(message),
    ),
  };
}

export function parseCommunityNoticeHandoffState(
  state: unknown,
): CommunityNoticeDraftRequest | undefined {
  const result = CommunityNoticeHandoffStateSchema.safeParse(state);

  return result.success ? result.data.communityNoticeDraftInput : undefined;
}
