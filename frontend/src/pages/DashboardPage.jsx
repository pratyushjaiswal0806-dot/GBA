import { useState } from 'react';
import { CategoryChart } from '../components/charts/CategoryChart.jsx';
import { TrendChart } from '../components/charts/TrendChart.jsx';
import { WardChart } from '../components/charts/WardChart.jsx';
import { DashboardMap } from '../components/DashboardMap.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { useDashboardData } from '../hooks/useDashboardData.js';
import { text } from '../i18n/en.js';
import { AppLink } from '../components/AppLink.jsx';

const intervals = ['week', 'month'];

function ChartSection({ title, description, actions, children }) {
  return (
    <section className="portal-section">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="portal-section-title">{title}</h2>
          <p className="portal-copy mt-1 text-sm">{description}</p>
        </div>
        {actions}
      </header>
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
          className={interval === option ? 'portal-button' : 'portal-button-secondary'}
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
    <main className="portal-page px-4 sm:px-6">
      <section className="mx-auto max-w-4xl">
        <header className="portal-page-heading">
          <div>
            <p className="portal-kicker">{text.portal.publicDashboard}</p>
            <h1 className="portal-title">{text.dashboard.title}</h1>
            <p className="portal-copy text-sm">{text.dashboard.description}</p>
            <p className="mt-2 text-xs font-medium text-slate-500">{text.dashboard.liveNote}</p>
          </div>
          <AppLink className="portal-button-secondary" href="/">{text.dashboard.backHome}</AppLink>
        </header>

        {state === 'loading' && <p className="portal-loading" role="status">{text.dashboard.loading}</p>}
        {state === 'error' && (
          <div className="portal-card portal-card--padded" role="alert">
            <p className="portal-alert">{text.dashboard.loadError} {text.dashboard.retryingAutomatically}</p>
            <button className="portal-button mt-4" onClick={retry} type="button">{text.dashboard.retry}</button>
          </div>
        )}

        {state === 'ready' && (
          <>
            {refreshFailed && <p className="portal-alert mt-5" role="status">{text.dashboard.refreshFailed}</p>}
            {data.summary.isDemoData && <p className="portal-notice mt-5" role="note">{text.dashboard.demoBanner}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={text.dashboard.total} value={data.summary.total} />
              <StatCard label={text.dashboard.open} value={data.summary.open} />
              <StatCard label={text.dashboard.resolved} value={data.summary.resolved} />
              <StatCard label={text.dashboard.resolutionRate} value={`${data.summary.resolutionRate}%`} />
            </div>

            {data.summary.total === 0 && <p className="portal-empty mt-5">{text.dashboard.empty}</p>}

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
