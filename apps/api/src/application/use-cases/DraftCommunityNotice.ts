import type { CommunityNoticeDraftResponse } from '@admin/contracts';
import type { CommunityNoticeGenerator } from '../ports/CommunityNoticeGenerator.js';

interface DraftCommunityNoticeDependencies {
  readonly generator: CommunityNoticeGenerator;
}

export class DraftCommunityNotice {
  constructor(private readonly dependencies: DraftCommunityNoticeDependencies) {}

  async execute(message: string): Promise<CommunityNoticeDraftResponse> {
    return this.dependencies.generator.draft(message);
  }
}
