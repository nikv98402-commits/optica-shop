import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

const PublicApp = lazy(() => import('../App'));
const FoundationRoutes = lazy(() => import('./FoundationRoutes').then((module) => ({ default: module.FoundationRoutes })));

export function AppRouter() {
  return (
    <Routes>
      <Route path="/:locale/organizations/:organizationId/*" element={<Suspense fallback={null}><FoundationRoutes /></Suspense>} />
      <Route path="*" element={<Suspense fallback={null}><PublicApp /></Suspense>} />
    </Routes>
  );
}
