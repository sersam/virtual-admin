import { createCommunityNoticeDraft } from '@admin/community-notices';

export {
  createCommunityNoticeDraft,
  type CommunityNoticeDraftContent,
} from '@admin/community-notices';

export function draftCommunityNotice(message: string): string {
  const draft = createCommunityNoticeDraft(message);

  return [`Asunto: ${draft.subject}`, '', draft.body].join('\n');
}
