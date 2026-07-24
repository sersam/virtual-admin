import type { CommunityNoticeDraftContent } from '../../domain/communication/CommunityNoticeDraft.js';
import type { AiProviderMode } from './AiProviderMode.js';

export interface CommunityNoticeDraftResult {
  readonly draft: CommunityNoticeDraftContent;
  readonly mode: AiProviderMode;
}

export interface CommunityNoticeGenerator {
  draft(message: string): Promise<CommunityNoticeDraftResult>;
}
