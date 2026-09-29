import { useEffect, useState } from 'react';

const initialHealth = {
  state: 'loading',
  data: null,
  error: null
};

const initialCategories = {
  state: 'loading',
  data: [],
  error: null
};

function StatusLine({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 last:border-b-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

function App() {
  const [health, setHealth] = useState(initialHealth);
  const [categories, setCategories] = useState(initialCategories);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHealth() {
      try {
        const response = await fetch('/api/health', { signal: controller.signal });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'The server returned an error.');
        }

        setHealth({ state: 'ready', data, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setHealth({ state: 'error', data: null, error: error.message });
        }
      }
    }

    async function loadCategories() {
      try {
        const response = await fetch('/api/categories', { signal: controller.signal });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'The categories request failed.');
        }

        setCategories({ state: 'ready', data: data.categories, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setCategories({ state: 'error', data: [], error: error.message });
        }
      }
    }

    loadHealth();
    loadCategories();

    return () => controller.abort();
  }, []);

  const isReady = health.state === 'ready';
  const isDatabaseReady = isReady && health.data.database === 'ok';
  const isDegraded = isReady && !isDatabaseReady;
  const serverValue = isReady ? 'OK' : health.state === 'loading' ? 'Checking…' : 'NOT REACHABLE';
  const databaseValue = isReady
    ? health.data.database === 'ok'
      ? 'OK'
      : 'DOWN'
    : health.state === 'loading'
      ? 'Checking…'
      : 'UNKNOWN';

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-2xl">
        <div className="mb-6 text-white">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
            GBA pilot
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Civic Issue Tracker
          </h1>
          <p className="mt-3 max-w-xl text-slate-300">
            Phase 1 skeleton: a standalone portal connected to its backend and database.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-xl sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">System status</h2>
              <p className="mt-1 text-sm text-slate-500">
                This page checks the backend through the Vite <code>/api</code> proxy.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                isDatabaseReady
                  ? 'bg-emerald-100 text-emerald-700'
                  : health.state === 'error'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isDatabaseReady
                ? 'Ready'
                : isDegraded
                  ? 'Degraded'
                : health.state === 'error'
                  ? 'Offline'
                  : 'Checking'}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 px-4">
            <StatusLine
              label="Server"
              value={serverValue}
              tone={serverValue === 'OK' ? 'text-emerald-600' : 'text-amber-600'}
            />
            <StatusLine
              label="Database"
              value={databaseValue}
              tone={databaseValue === 'OK' ? 'text-emerald-600' : 'text-amber-600'}
            />
          </div>

          {health.error && (
            <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
              Server not reachable. Start the backend and refresh this page.
            </p>
          )}

          <div className="mt-6 border-t border-slate-200 pt-5">
            <h2 className="text-xl font-semibold text-slate-900">Reportable categories</h2>
            <p className="mt-1 text-sm text-slate-500">
              These choices come from the database and will be used by the report form.
            </p>

            {categories.state === 'loading' && (
              <p className="mt-4 text-sm text-slate-500">Loading categories…</p>
            )}

            {categories.state === 'error' && (
              <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
                Could not load the category list. Start the backend and refresh this page.
              </p>
            )}

            {categories.state === 'ready' && categories.data.length === 0 && (
              <p className="mt-4 text-sm text-slate-500">No reportable categories are configured.</p>
            )}

            {categories.state === 'ready' && categories.data.length > 0 && (
              <ul className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="Reportable categories">
                {categories.data.map((category) => (
                  <li
                    className="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-4 text-sm font-semibold text-cyan-900"
                    key={category.code}
                  >
                    {category.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
