import { lazy, Suspense, useEffect, useState } from 'react';
import { ReportPage } from './pages/ReportPage.jsx';
import { TrackPage } from './pages/TrackPage.jsx';
import { text } from './i18n/en.js';
import { navigate } from './routing.js';

const initialHealth = { state: 'loading', data: null, error: null };
const initialCategories = { state: 'loading', data: [], error: null };
const StaffArea = lazy(() => import('./StaffArea.jsx'));

function StatusLine({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 last:border-b-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
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
        const response = await fetch('/api/health', { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'The server returned an error.');
        setHealth({ state: 'ready', data, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') setHealth({ state: 'error', data: null, error: error.message });
      }
    }

    async function loadCategories() {
      try {
        const response = await fetch('/api/categories', { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'The categories request failed.');
        setCategories({ state: 'ready', data: data.categories, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') setCategories({ state: 'error', data: [], error: error.message });
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

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-start justify-between gap-4 text-white">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">{text.app.eyebrow}</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{text.app.title}</h1>
            <p className="mt-3 max-w-xl text-slate-300">{text.app.description}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button className="rounded-lg border border-slate-500 px-3 py-2 text-sm font-semibold hover:bg-slate-800" onClick={() => navigate('/track')} type="button">{text.track.homeLink}</button>
            <button className="rounded-lg border border-slate-500 px-3 py-2 text-sm font-semibold hover:bg-slate-800" onClick={() => navigate('/login')} type="button">{text.auth.staffLogin}</button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-xl sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{text.health.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{text.health.description}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${isDatabaseReady ? 'bg-emerald-100 text-emerald-700' : health.state === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
              {isDatabaseReady ? text.health.ready : isDegraded ? text.health.degraded : health.state === 'error' ? text.health.offline : text.health.checking}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 px-4">
            <StatusLine label={text.health.server} value={serverValue} tone={serverValue === text.health.ok ? 'text-emerald-600' : 'text-amber-600'} />
            <StatusLine label={text.health.database} value={databaseValue} tone={databaseValue === text.health.ok ? 'text-emerald-600' : 'text-amber-600'} />
          </div>
          {health.error && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{text.health.error}</p>}

          <div className="mt-6 border-t border-slate-200 pt-5">
            <h2 className="text-xl font-semibold text-slate-900">{text.categories.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{text.categories.description}</p>
            {categories.state === 'loading' && <p className="mt-4 text-sm text-slate-500">{text.categories.loading}</p>}
            {categories.state === 'error' && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{text.categories.error}</p>}
            {categories.state === 'ready' && categories.data.length === 0 && <p className="mt-4 text-sm text-slate-500">{text.categories.empty}</p>}
            {categories.state === 'ready' && categories.data.length > 0 && (
              <ul className="mt-4 grid gap-3 sm:grid-cols-3" aria-label={text.categories.label}>
                {categories.data.map((category) => <li className="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-4 text-sm font-semibold text-cyan-900" key={category.code}>{category.name}</li>)}
              </ul>
            )}
          </div>
        </div>
        <ReportPage categories={categories} />
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

  if (path === '/track') return <TrackPage />;
  if (path === '/login' || path === '/officer' || path === '/verifier' || /^\/officer\/tickets\/\d+(?:\/action-report)?$/.test(path) || /^\/verifier\/tickets\/\d+$/.test(path)) {
    return <Suspense fallback={<p className="p-6 text-sm text-slate-600" role="status">{text.auth.loading}</p>}><StaffArea path={path} /></Suspense>;
  }
  return <HomePage />;
}

function App() {
  return <AppContent />;
}

export default App;
