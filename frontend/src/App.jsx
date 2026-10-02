import { lazy, Suspense, useEffect, useState } from 'react';
import { requestJson } from './api/client.js';
import { ReportPage } from './pages/ReportPage.jsx';
import { TrackPage } from './pages/TrackPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { text } from './i18n/en.js';
import { PortalChrome } from './components/PortalChrome.jsx';
import { AppLink } from './components/AppLink.jsx';
import { HeroIllustration } from './components/HeroIllustration.jsx';
import { Icon } from './components/Icon.jsx';

const stepIcons = ['camera', 'user', 'check', 'shield'];
const initialCategories = { state: 'loading', data: [], error: null };
const StaffArea = lazy(() => import('./StaffArea.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));

function HomePage() {
  const [categories, setCategories] = useState(initialCategories);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const data = await requestJson('/api/categories', { signal: controller.signal });
        setCategories({ state: 'ready', data: data.categories, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') setCategories({ state: 'error', data: [], error: error.message || text.categories.error });
      }
    }

    loadCategories();
    return () => controller.abort();
  }, []);

  return (
    <main className="portal-page portal-page--home">
      <section className="hero">
        <div className="hero__inner">
          <div>
            <p className="portal-kicker">{text.app.eyebrow}</p>
            <h1>{text.home.heroTitle} <span>{text.home.heroTitleAccent}</span></h1>
            <p className="hero__lead">{text.home.heroDescription}</p>
            <div className="hero__actions">
              <a className="portal-button" href="#report">{text.home.reportAction}<Icon name="arrow" size={18} /></a>
              <AppLink className="portal-button-secondary" href="/track">{text.home.trackAction}</AppLink>
            </div>
            <ul className="hero__chips">
              {text.home.chips.map((chip) => <li key={chip}><Icon name="check" size={16} />{chip}</li>)}
            </ul>
          </div>
          <HeroIllustration />
        </div>
      </section>

      <div className="home-page-width px-4 sm:px-6">
        <section aria-labelledby="how-it-works-title" className="home-section home-steps">
          <h2 className="home-section__title" id="how-it-works-title">{text.home.howTitle}</h2>
          <ol>
            {text.home.steps.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true" className="home-steps__count">{index + 1}</span>
                <span className="icon-chip"><Icon name={stepIcons[index]} /></span>
                <strong>{step.title}</strong>
                <span>{step.description}</span>
              </li>
            ))}
          </ol>
          <div className="home-promise">
            <span className="icon-chip"><Icon name="shield" /></span>
            <p><strong>{text.portal.promiseTitle}</strong>{text.portal.promiseDescription}</p>
          </div>
        </section>

        <div className="home-grid home-section">
          <ReportPage categories={categories} />
          <aside className="home-sidebar">
            <section aria-labelledby="home-track-title" className="home-sidebar__panel">
              <span className="icon-chip"><Icon name="search" /></span>
              <h2 className="mt-3" id="home-track-title">{text.home.trackTitle}</h2>
              <p className="mt-1 text-slate-700">{text.home.trackDescription}</p>
              <AppLink className="portal-button-secondary mt-4 w-full" href="/track">{text.home.trackAction}</AppLink>
            </section>
            <section aria-labelledby="home-dashboard-title" className="home-sidebar__panel">
              <span className="icon-chip"><Icon name="chart" /></span>
              <h2 className="mt-3" id="home-dashboard-title">{text.home.dashboardTitle}</h2>
              <p className="mt-1 text-slate-700">{text.home.dashboardDescription}</p>
              <AppLink className="portal-button-secondary mt-4 w-full" href="/dashboard">{text.home.dashboardAction}</AppLink>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

const pageTitles = {
  '/': text.portal.report,
  '/track': text.track.homeLink,
  '/dashboard': text.dashboard.homeLink,
  '/login': text.auth.staffLogin,
  '/officer': text.officer.title,
  '/verifier': text.verifier.queueTitle
};

function titleForPath(path) {
  if (pageTitles[path]) return pageTitles[path];
  if (path.startsWith('/officer')) return text.officer.title;
  if (path.startsWith('/verifier')) return text.verifier.queueTitle;
  return text.notFound.title;
}

function AppContent() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname);
    window.addEventListener('popstate', updatePath);
    return () => window.removeEventListener('popstate', updatePath);
  }, []);

  useEffect(() => {
    document.title = `${titleForPath(path)} | ${text.app.title}`;
  }, [path]);

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
