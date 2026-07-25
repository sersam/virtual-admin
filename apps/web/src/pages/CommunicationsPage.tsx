import { CommunityNoticePanel } from '../features/communications/components/CommunityNoticePanel';
import { useLocation } from 'react-router';
import { parseCommunityNoticeHandoffState } from '../shared/model/communityNoticeHandoff';

export function CommunicationsPage() {
  const location = useLocation();

  return <CommunityNoticePanel initialInput={parseCommunityNoticeHandoffState(location.state)} />;
}
