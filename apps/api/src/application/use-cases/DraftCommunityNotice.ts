import type {
  CommunityNoticeDraftResult,
  CommunityNoticeGenerator,
} from '../ports/CommunityNoticeGenerator.js';
import type { CommunityNoticeDraftInput } from '../../domain/communication/CommunityNoticeDraft.js';

interface DraftCommunityNoticeDependencies {
  readonly generator: CommunityNoticeGenerator;
}

export class DraftCommunityNotice {
  constructor(private readonly dependencies: DraftCommunityNoticeDependencies) {}

  async execute(input: CommunityNoticeDraftInput): Promise<CommunityNoticeDraftResult> {
    return this.dependencies.generator.draft(input);
  }
}
