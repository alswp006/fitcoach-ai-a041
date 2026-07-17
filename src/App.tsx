import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, type ReactElement } from 'react';
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
import Plan from './pages/Plan';
import Workout from './pages/Workout';
import Report from './pages/Report';
import Challenges from './pages/Challenges';
import Premium from './pages/Premium';
import { AppProvider, useApp } from './lib/AppContext';
import { AppTabBar } from './components/AppTabBar';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

// /, /plan, /challenges만 하단 FloatingTabBar를 노출하는 탭-루트다.
const TAB_BAR_PATHS = new Set(['/', '/plan', '/challenges']);

/** onboardingDone===false면 /onboarding으로 replace 리다이렉트하는 라우트 가드. */
function RequireOnboarding({ children }: { children: ReactElement }) {
  const { flags } = useApp();
  if (!flags.onboardingDone) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

let __appRoutesRenderCount = 0;
function AppRoutes() {
  const location = useLocation();
  __appRoutesRenderCount += 1;
  console.log("APPROUTES_DEBUG count=", __appRoutesRenderCount, "pathname=", location.pathname, "key=", location.key);

  return (
    <>
      <Routes>
        <Route path="/" element={<RequireOnboarding><Home /></RequireOnboarding>} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/plan" element={<RequireOnboarding><Plan /></RequireOnboarding>} />
        <Route
          path="/workout/:exerciseId"
          element={<RequireOnboarding><Workout /></RequireOnboarding>}
        />
        <Route
          path="/report/:sessionId"
          element={<RequireOnboarding><Report /></RequireOnboarding>}
        />
        <Route path="/challenges" element={<RequireOnboarding><Challenges /></RequireOnboarding>} />
        <Route path="/premium" element={<RequireOnboarding><Premium /></RequireOnboarding>} />
        {DevTdsGallery && (
          <Route
            path="/__tds-gallery"
            element={
              <Suspense fallback={null}>
                <DevTdsGallery />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {TAB_BAR_PATHS.has(location.pathname) && <AppTabBar />}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
