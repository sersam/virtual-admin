import { Route, Routes } from 'react-router';
import { ComingSoonPage } from '../pages/ComingSoonPage';
import { DocumentsPage } from '../pages/DocumentsPage';
import { HomePage } from '../pages/HomePage';
import { navigationItems } from '../shared/config/navigation';
import { AppShell } from './layout/AppShell';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="/documentos" element={<DocumentsPage />} />
        {navigationItems
          .filter(({ path }) => !['/', '/documentos'].includes(path))
          .map(({ path }) => (
            <Route key={path} path={path} element={<ComingSoonPage />} />
          ))}
        <Route path="*" element={<ComingSoonPage />} />
      </Route>
    </Routes>
  );
}
