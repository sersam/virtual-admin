import { Route, Routes } from 'react-router';
import { ChatPage } from '../pages/ChatPage';
import { CommunicationsPage } from '../pages/CommunicationsPage';
import { ComingSoonPage } from '../pages/ComingSoonPage';
import { DocumentsPage } from '../pages/DocumentsPage';
import { HomePage } from '../pages/HomePage';
import { IncidentsPage } from '../pages/IncidentsPage';
import { MeetingAgendaPage } from '../pages/MeetingAgendaPage';
import { MeetingMinutesPage } from '../pages/MeetingMinutesPage';
import { navigationItems } from '../shared/config/navigation';
import { AppShell } from './layout/AppShell';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/documentos" element={<DocumentsPage />} />
        <Route path="/comunicados" element={<CommunicationsPage />} />
        <Route path="/actas" element={<MeetingMinutesPage />} />
        <Route path="/incidencias" element={<IncidentsPage />} />
        <Route path="/juntas" element={<MeetingAgendaPage />} />
        {navigationItems
          .filter(
            ({ path }) =>
              ![
                '/',
                '/chat',
                '/documentos',
                '/comunicados',
                '/actas',
                '/incidencias',
                '/juntas',
              ].includes(path),
          )
          .map(({ path }) => (
            <Route key={path} path={path} element={<ComingSoonPage />} />
          ))}
        <Route path="*" element={<ComingSoonPage />} />
      </Route>
    </Routes>
  );
}
