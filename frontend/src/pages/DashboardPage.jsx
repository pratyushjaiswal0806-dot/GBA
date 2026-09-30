import { useCallback, useEffect, useState } from 'react';
import { requestJson } from '../api/client.js';
import { CategoryChart } from '../components/charts/CategoryChart.jsx';
import { WardChart } from '../components/charts/WardChart.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { text } from '../i18n/en.js';
import { navigate } from '../routing.js';

async function loadDashboard(signal) {
  const [summary, byWard, byCategory] = await Promise.all([
    requestJson('/api/dashboard/summary', { signal }),
    requestJson('/api/dashboard/by-ward', { signal }),
    requestJson('/api/dashboard/by-category', { signal })
  ]);

  return { summary, wards: byWard.wards, categories: byCategory.categories };
}

function ChartSection({ title, description, children }) {
  return (
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-xl sm:p-7">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 mb-4 text-sm text-slate-500">{description}</p>
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState({ state: 'loading', data: null });
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => setReloadKey((current) => current + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setDashboard((current) => (current.data ? current : { state: 'loading', data: null }));

      try {
        const data = await loadDashboard(controller.signal);
        if (!controller.signal.aborted) setDashboard({ state: 'ready', data });
      } catch (error) {
        if (error.name !== 'AbortError') setDashboard({ state: 'error', data: null });
      }
    }

    load();
    return () => controller.abort();
  }, [reloadKey]);

  const data = dashboard.data;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-4xl">
        <header className="text-white">
          <button className="text-sm font-semibold text-cyan-200 hover:text-white" onClick={() => navigate('/')} type="button">← {text.dashboard.backHome}</button>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{text.dashboard.title}</h1>
          <p className="mt-2 text-sm text-slate-300">{text.dashboard.description}</p>
        </header>

        {dashboard.state === 'loading' && <p className="mt-6 text-sm text-slate-300" role="status">{text.dashboard.loading}</p>}
        {dashboard.state === 'error' && (
          <div className="mt-6 rounded-2xl bg-white p-5 shadow-xl" role="alert">
            <p className="text-sm text-rose-700">{text.dashboard.loadError}</p>
            <button className="mt-3 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800" onClick={retry} type="button">{text.dashboard.retry}</button>
          </div>
        )}

        {dashboard.state === 'ready' && (
          <>
            {data.summary.isDemoData && <p className="mt-6 rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950" role="note">{text.dashboard.demoBanner}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={text.dashboard.total} value={data.summary.total} />
              <StatCard label={text.dashboard.open} value={data.summary.open} />
              <StatCard label={text.dashboard.resolved} value={data.summary.resolved} />
              <StatCard label={text.dashboard.resolutionRate} value={`${data.summary.resolutionRate}%`} />
            </div>

            {data.summary.total === 0 && <p className="mt-6 text-sm text-slate-300">{text.dashboard.empty}</p>}

            <ChartSection description={text.dashboard.wardDescription} title={text.dashboard.wardTitle}>
              <WardChart wards={data.wards} />
            </ChartSection>
            <ChartSection description={text.dashboard.categoryDescription} title={text.dashboard.categoryTitle}>
              <CategoryChart categories={data.categories} />
            </ChartSection>
          </>
        )}
      </section>
    </main>
  );
}
