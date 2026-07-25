import {
  buildCommunityNoticeInputFromText,
  createCommunityNoticeDraft,
} from '@admin/community-notices';

export {
  buildCommunityNoticeInputFromText,
  createCommunityNoticeDraft,
  type CommunityNoticeDraftContent,
  type CommunityNoticeDraftInput,
} from '@admin/community-notices';

export function draftCommunityNotice(message: string): string {
  const draft = createCommunityNoticeDraft(buildCommunityNoticeInputFromText(message));

  return [`Asunto: ${draft.subject}`, '', draft.body].join('\n');
}
