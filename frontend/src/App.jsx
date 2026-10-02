import { lazy, Suspense, useEffect, useState } from 'react';
import { requestJson } from './api/client.js';
import { ReportPage } from './pages/ReportPage.jsx';
import { TrackPage } from './pages/TrackPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { text } from './i18n/en.js';
import { PortalChrome } from './components/PortalChrome.jsx';

const initialHealth = { state: 'loading', data: null, error: null };
const initialCategories = { state: 'loading', data: [], error: null };
const StaffArea = lazy(() => import('./StaffArea.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));

function StatusLine({ label, value }) {
  return (
    <div className="health-row">
      <span className="health-row__label">{label}</span>
      <span className="health-row__value">{value}</span>
    </div>
  );
}

function HomePage() {
  const [health, setHealth] = useState(initialHealth);
  const [categories, setCategories] = useState(initialCategories);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHealth() {
      try {
        const data = await requestJson('/api/health', { signal: controller.signal });
        setHealth({ state: 'ready', data, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') setHealth({ state: 'error', data: null, error: error.message || text.health.error });
      }
    }

    async function loadCategories() {
      try {
        const data = await requestJson('/api/categories', { signal: controller.signal });
        setCategories({ state: 'ready', data: data.categories, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') setCategories({ state: 'error', data: [], error: error.message || text.categories.error });
      }
    }

    loadHealth();
    loadCategories();
    return () => controller.abort();
  }, []);

  const isReady = health.state === 'ready';
  const isDatabaseReady = isReady && health.data.database === 'ok';
  const isDegraded = isReady && !isDatabaseReady;
  const serverValue = isReady ? text.health.ok : health.state === 'loading' ? text.health.checking : text.health.notReachable;
  const databaseValue = isReady ? health.data.database === 'ok' ? text.health.ok : text.health.down : health.state === 'loading' ? text.health.checking : text.health.unknown;
  const healthTone = isDatabaseReady ? 'health-state--good' : 'health-state--warn';

  return (
    <main className="portal-page portal-page--home px-4 sm:px-6">
      <section className="home-page-width">
        <header className="home-heading">
          <div className="home-heading__copy">
            <p className="portal-kicker">{text.app.eyebrow}</p>
            <h1>{text.app.title}</h1>
            <p>{text.app.description}</p>
          </div>
          <div className="home-promise">
            <p><strong>{text.portal.promiseTitle}</strong>{text.portal.promiseDescription}</p>
          </div>
        </header>

        <div className="home-grid">
          <ReportPage categories={categories} />
          <aside className="home-sidebar">
            <section aria-labelledby="system-status-title" className="home-sidebar__panel">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="system-status-title">{text.health.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{text.health.description}</p>
                </div>
                <span className={`health-state ${healthTone}`}>
                  {isDatabaseReady ? text.health.ready : isDegraded ? text.health.degraded : health.state === 'error' ? text.health.offline : text.health.checking}
                </span>
              </header>
              <div className="mt-3">
                <StatusLine label={text.health.server} value={serverValue} />
                <StatusLine label={text.health.database} value={databaseValue} />
              </div>
              {health.error && <p className="portal-alert mt-3" role="alert">{text.health.error}</p>}
            </section>

            <section aria-labelledby="report-categories-title" className="home-sidebar__panel">
              <h2 id="report-categories-title">{text.categories.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{text.categories.description}</p>
              {categories.state === 'loading' && <p className="portal-loading">{text.categories.loading}</p>}
              {categories.state === 'error' && <p className="portal-alert mt-3" role="alert">{categories.error || text.categories.error}</p>}
              {categories.state === 'ready' && categories.data.length === 0 && <p className="portal-empty mt-3">{text.categories.empty}</p>}
              {categories.state === 'ready' && categories.data.length > 0 && (
                <ul aria-label={text.categories.label} className="category-list">
                  {categories.data.map((category) => <li key={category.code}>{category.name}</li>)}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function AppContent() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname);
    window.addEventListener('popstate', updatePath);
    return () => window.removeEventListener('popstate', updatePath);
  }, []);

  let page;
  if (path === '/track') page = <TrackPage />;
  if (path === '/dashboard') {
    page = <Suspense fallback={<p className="portal-loading px-6" role="status">{text.dashboard.loading}</p>}><DashboardPage /></Suspense>;
  }
  if (path === '/login' || path === '/officer' || path === '/verifier' || /^\/officer\/tickets\/\d+(?:\/action-report)?$/.test(path) || /^\/verifier\/tickets\/\d+$/.test(path)) {
    page = <Suspense fallback={<p className="portal-loading px-6" role="status">{text.auth.loading}</p>}><StaffArea path={path} /></Suspense>;
  }
  if (path === '/') page = <HomePage />;
  if (!page) page = <NotFoundPage />;

  return <PortalChrome path={path}>{page}</PortalChrome>;
}

function App() {
  return <AppContent />;
}

export default App;
