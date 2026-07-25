import { describe, expect, it } from 'vitest';
import {
  createCommunityNoticeHandoffState,
  parseCommunityNoticeHandoffState,
} from './communityNoticeHandoff';

describe('communityNoticeHandoff', () => {
  it('crea estado de navegacion con asunto extraido y valores por defecto', () => {
    expect(
      createCommunityNoticeHandoffState(
        'Redacta un comunicado para avisar del corte de agua del jueves.',
      ),
    ).toEqual({
      communityNoticeDraftInput: {
        subject: 'Corte de agua del jueves',
        type: 'informativo',
        audience: 'todos',
        tone: 'formal',
      },
    });
  });

  it('parsea solo estado interno valido', () => {
    expect(
      parseCommunityNoticeHandoffState({
        communityNoticeDraftInput: {
          subject: 'Corte de agua',
          type: 'informativo',
          audience: 'todos',
          tone: 'formal',
        },
      }),
    ).toEqual({
      subject: 'Corte de agua',
      type: 'informativo',
      audience: 'todos',
      tone: 'formal',
    });

    expect(
      parseCommunityNoticeHandoffState({
        communityNoticeDraftInput: {
          subject: 'ok',
          type: 'otro',
          audience: 'todos',
          tone: 'formal',
        },
      }),
    ).toBeUndefined();
  });

  it('usa un asunto valido cuando el asunto derivado es demasiado corto', () => {
    expect(createCommunityNoticeHandoffState('ok')).toEqual({
      communityNoticeDraftInput: {
        subject: 'Corte de agua',
        type: 'informativo',
        audience: 'todos',
        tone: 'formal',
      },
    });
  });

  it('recorta asuntos derivados que superan el limite del contrato', () => {
    const subject = 'a'.repeat(121);

    expect(createCommunityNoticeHandoffState(subject).communityNoticeDraftInput.subject).toBe(
      'A'.concat('a'.repeat(119)),
    );
  });
});
