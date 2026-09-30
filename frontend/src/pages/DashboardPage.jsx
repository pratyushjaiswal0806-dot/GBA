import { useState } from 'react';
import { CategoryChart } from '../components/charts/CategoryChart.jsx';
import { TrendChart } from '../components/charts/TrendChart.jsx';
import { WardChart } from '../components/charts/WardChart.jsx';
import { DashboardMap } from '../components/DashboardMap.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { useDashboardData } from '../hooks/useDashboardData.js';
import { text } from '../i18n/en.js';
import { navigate } from '../routing.js';

const intervals = ['week', 'month'];

function ChartSection({ title, description, actions, children }) {
  return (
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-xl sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 mb-4 text-sm text-slate-500">{description}</p>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function IntervalToggle({ interval, onChange }) {
  return (
    <div aria-label={text.dashboard.intervalLabel} className="inline-flex rounded-lg border border-slate-300 p-0.5" role="group">
      {intervals.map((option) => (
        <button
          aria-pressed={interval === option}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${interval === option ? 'bg-cyan-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {text.dashboard[option]}
        </button>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [trendInterval, setTrendInterval] = useState('week');
  const { state, data, refreshFailed, retry } = useDashboardData(trendInterval);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-4xl">
        <header className="text-white">
          <button className="text-sm font-semibold text-cyan-200 hover:text-white" onClick={() => navigate('/')} type="button">← {text.dashboard.backHome}</button>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{text.dashboard.title}</h1>
          <p className="mt-2 text-sm text-slate-300">{text.dashboard.description}</p>
          <p className="mt-1 text-xs text-slate-400">{text.dashboard.liveNote}</p>
        </header>

        {state === 'loading' && <p className="mt-6 text-sm text-slate-300" role="status">{text.dashboard.loading}</p>}
        {state === 'error' && (
          <div className="mt-6 rounded-2xl bg-white p-5 shadow-xl" role="alert">
            <p className="text-sm text-rose-700">{text.dashboard.loadError} {text.dashboard.retryingAutomatically}</p>
            <button className="mt-3 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800" onClick={retry} type="button">{text.dashboard.retry}</button>
          </div>
        )}

        {state === 'ready' && (
          <>
            {refreshFailed && <p className="mt-6 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900" role="status">{text.dashboard.refreshFailed}</p>}
            {data.summary.isDemoData && <p className="mt-6 rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950" role="note">{text.dashboard.demoBanner}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={text.dashboard.total} value={data.summary.total} />
              <StatCard label={text.dashboard.open} value={data.summary.open} />
              <StatCard label={text.dashboard.resolved} value={data.summary.resolved} />
              <StatCard label={text.dashboard.resolutionRate} value={`${data.summary.resolutionRate}%`} />
            </div>

            {data.summary.total === 0 && <p className="mt-6 text-sm text-slate-300">{text.dashboard.empty}</p>}

            <ChartSection description={text.dashboard.mapDescription} title={text.dashboard.mapTitle}>
              <DashboardMap points={data.points} />
            </ChartSection>
            <ChartSection actions={<IntervalToggle interval={trendInterval} onChange={setTrendInterval} />} description={text.dashboard.trendDescription} title={text.dashboard.trendTitle}>
              <TrendChart interval={trendInterval} points={data.trend} />
            </ChartSection>
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
