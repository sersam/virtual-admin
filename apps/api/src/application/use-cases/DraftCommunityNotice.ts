import type {
  CommunityNoticeDraftResult,
  CommunityNoticeGenerator,
} from '../ports/CommunityNoticeGenerator.js';

interface DraftCommunityNoticeDependencies {
  readonly generator: CommunityNoticeGenerator;
}

export class DraftCommunityNotice {
  constructor(private readonly dependencies: DraftCommunityNoticeDependencies) {}

  async execute(message: string): Promise<CommunityNoticeDraftResult> {
    return this.dependencies.generator.draft(message);
  }
}
