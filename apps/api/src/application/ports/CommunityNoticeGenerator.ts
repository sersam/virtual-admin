import type { CommunityNoticeDraftResponse } from '@admin/contracts';

export interface CommunityNoticeGenerator {
  draft(message: string): Promise<CommunityNoticeDraftResponse>;
}
