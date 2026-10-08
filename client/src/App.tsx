import { Suspense, lazy } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Skeleton, ToastViewport } from './components/ui';
import { TopNav } from './components/layout/TopNav';
import { LeftRail } from './components/layout/LeftRail';
import { Footer } from './components/layout/Footer';
import { PageTransition } from './components/layout/PageTransition';

const Home = lazy(() => import('./pages/Home'));
const PlayComputer = lazy(() => import('./pages/PlayComputer'));
const PlayLocal = lazy(() => import('./pages/PlayLocal'));
const PlayOnline = lazy(() => import('./pages/PlayOnline'));
const OnlineGame = lazy(() => import('./pages/OnlineGame'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Design = lazy(() => import('./pages/Design'));
const Sandbox = lazy(() => import('./pages/Sandbox'));

const devOnly = (node: ReactNode) => (import.meta.env.DEV ? node : <Navigate to="/" replace />);

function RouteFallback() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-label="Loading page"
    >
      <Skeleton className="h-8 w-56 rounded-[10px]" />
      <Skeleton className="aspect-square w-full max-w-[520px] rounded-[6px]" />
      <Skeleton className="h-4 w-2/3 rounded-[8px]" />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isMain = location.pathname === '/';
  const isGame = location.pathname.startsWith('/play/') || location.pathname.startsWith('/game/');

  if (isMain) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <PageTransition>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
            </Routes>
          </Suspense>
        </PageTransition>
        <ToastViewport />
      </div>
    );
  }

  if (isGame) {
    return (
      <div className="flex min-h-screen bg-[var(--bg)]">
        <div className="hidden lg:flex">
          <LeftRail collapsed />
        </div>
        <div className="min-w-0 flex-1">
          <PageTransition>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/play/computer" element={<PlayComputer />} />
                <Route path="/play/local" element={<PlayLocal />} />
                <Route path="/play/online" element={<PlayOnline />} />
                <Route path="/game/:roomId" element={<OnlineGame />} />
              </Routes>
            </Suspense>
          </PageTransition>
        </div>
        <ToastViewport />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      <TopNav />
      <div className="flex-1">
        <PageTransition>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/play/computer" element={<PlayComputer />} />
              <Route path="/play/local" element={<PlayLocal />} />
              <Route path="/play/online" element={<PlayOnline />} />
              <Route path="/game/:roomId" element={<OnlineGame />} />
              <Route path="/design" element={devOnly(<Design />)} />
              <Route path="/sandbox" element={devOnly(<Sandbox />)} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </PageTransition>
      </div>
      <Footer />
      <ToastViewport />
    </div>
  );
}
