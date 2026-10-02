import { useRef, useState } from 'react';
import { requestJson } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { TicketTimeline } from '../components/TicketTimeline.jsx';
import { text } from '../i18n/en.js';
import { AppLink } from '../components/AppLink.jsx';

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function TrackPage() {
  const [code, setCode] = useState(() => new URLSearchParams(window.location.search).get('code') ?? '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const submitLock = useRef(false);

  async function submit(event) {
    event.preventDefault();

    if (submitLock.current) return;

    if (!code.trim()) {
      setError(text.track.codeRequired);
      setResult(null);
      window.requestAnimationFrame(() => document.getElementById('track-code')?.focus());
      return;
    }

    setError(null);
    submitLock.current = true;
    setLoading(true);

    try {
      const data = await requestJson(`/api/reports/${encodeURIComponent(code.trim())}`);
      setResult(data);
    } catch (requestError) {
      setResult(null);
      setError(requestError.message || text.track.notFound);
    } finally {
      submitLock.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="portal-page px-4 sm:px-6">
      <section className="mx-auto max-w-2xl">
        <AppLink className="portal-back-link" href="/">← {text.track.backHome}</AppLink>
        <article className="portal-card portal-card--padded mt-3">
          <h1 className="portal-title">{text.track.title}</h1>
          <p className="portal-copy mt-2">{text.track.description}</p>
          <form className="mt-6" onSubmit={submit}>
            <label className="portal-field-label" htmlFor="track-code">{text.track.codeLabel}</label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            
            <input aria-describedby={error ? 'track-code-error' : undefined} aria-invalid={Boolean(error)} autoComplete="off" className="portal-field min-w-0 font-mono" disabled={loading} id="track-code" maxLength={200} name="ticketCode" onChange={(event) => setCode(event.target.value)} placeholder={text.track.codePlaceholder} spellCheck={false} value={code} />
            <button className="portal-button w-full sm:w-auto" disabled={loading} type="submit">{loading ? text.track.loading : text.track.submit}</button>
            </div>
          </form>
          {error && <p className="portal-alert mt-4" id="track-code-error" role="alert">{error}</p>}
          {result && (
            <section className="mt-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="portal-data font-mono text-sm font-bold text-blue-900">{result.publicCode}</p>
                  <h2 className="portal-section-title mt-2">{result.categoryName}</h2>
                </div>
                <StatusBadge status={result.status} />
              </div>
              <dl className="portal-card--inset portal-data mt-5 grid gap-3 p-4 sm:grid-cols-2">
                <div><dt className="font-semibold text-slate-700">{text.track.ward}</dt><dd className="mt-1 break-words text-slate-900">{result.wardName || text.ticket.notAvailable}</dd></div>
                <div><dt className="font-semibold text-slate-700">{text.track.area}</dt><dd className="mt-1 break-words text-slate-900">{result.area || text.ticket.notAvailable}</dd></div>
                <div><dt className="font-semibold text-slate-700">{text.track.created}</dt><dd className="mt-1 text-slate-900">{formatDate(result.createdAt)}</dd></div>
                <div><dt className="font-semibold text-slate-700">{text.track.supportCount}</dt><dd className="mt-1 text-slate-900">{result.supportCount}</dd></div>
              </dl>
              <h3 className="portal-section-title mb-4 mt-7">{text.ticket.timeline}</h3>
              <TicketTimeline entries={result.timeline} />
            </section>
          )}
        </article>
      </section>
    </main>
  );
}
