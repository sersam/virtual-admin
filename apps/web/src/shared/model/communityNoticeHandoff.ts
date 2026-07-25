import { buildCommunityNoticeInputFromText } from '@admin/community-notices';
import {
  CommunityNoticeDraftRequestSchema,
  type CommunityNoticeDraftRequest,
} from '@admin/contracts';
import { z } from 'zod';

const DEFAULT_SUBJECT = 'Corte de agua';
const MAX_SUBJECT_LENGTH = 120;

const CommunityNoticeHandoffStateSchema = z.object({
  communityNoticeDraftInput: CommunityNoticeDraftRequestSchema,
});

export function createCommunityNoticeHandoffState(message: string) {
  const input = buildCommunityNoticeInputFromText(message);

  return {
    communityNoticeDraftInput: CommunityNoticeDraftRequestSchema.parse({
      ...input,
      subject: normalizeSubject(input.subject),
    }),
  };
}

export function parseCommunityNoticeHandoffState(
  state: unknown,
): CommunityNoticeDraftRequest | undefined {
  const result = CommunityNoticeHandoffStateSchema.safeParse(state);

  return result.success ? result.data.communityNoticeDraftInput : undefined;
}

function normalizeSubject(subject: string): string {
  const trimmedSubject = subject.trim();
  if (trimmedSubject.length < 3) return DEFAULT_SUBJECT;

  return trimmedSubject.slice(0, MAX_SUBJECT_LENGTH);
}
