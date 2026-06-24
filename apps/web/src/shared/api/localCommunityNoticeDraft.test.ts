import { describe, expect, it } from 'vitest';
import { createLocalCommunityNoticeDraft } from './localCommunityNoticeDraft';

describe('createLocalCommunityNoticeDraft', () => {
  it('redacta un borrador local estructurado', () => {
    expect(
      createLocalCommunityNoticeDraft('Redacta un comunicado sobre el corte de agua.'),
    ).toEqual({
      draft: {
        subject: 'Corte de agua',
        body: expect.stringContaining('Estimados vecinos:'),
      },
      mode: 'deterministic-demo',
    });
  });
});
