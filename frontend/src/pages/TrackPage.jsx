import { useState } from 'react';
import { requestJson } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { TicketTimeline } from '../components/TicketTimeline.jsx';
import { text } from '../i18n/en.js';
import { navigate } from '../routing.js';

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function TrackPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();

    if (!code.trim()) {
      setError(text.track.codeRequired);
      setResult(null);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await requestJson(`/api/reports/${encodeURIComponent(code.trim())}`);
      setResult(data);
    } catch (requestError) {
      setResult(null);
      setError(requestError.message || text.track.notFound);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-2xl">
        <button className="text-sm font-semibold text-cyan-200 hover:text-white" onClick={() => navigate('/')} type="button">← {text.track.backHome}</button>
        <article className="mt-4 rounded-2xl bg-white p-5 shadow-xl sm:p-7">
          <h1 className="text-2xl font-semibold text-slate-900">{text.track.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{text.track.description}</p>
          <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
            <label className="sr-only" htmlFor="track-code">{text.track.codeLabel}</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900" id="track-code" maxLength={200} onChange={(event) => setCode(event.target.value)} placeholder={text.track.codePlaceholder} value={code} />
            <button className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-70" disabled={loading} type="submit">{loading ? text.track.loading : text.track.submit}</button>
          </form>
          {error && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p>}
          {result && (
            <section className="mt-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-sm font-semibold text-cyan-800">{result.publicCode}</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">{result.categoryName}</h2>
                </div>
                <StatusBadge status={result.status} />
              </div>
              <dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
                <div><dt className="font-semibold text-slate-700">{text.track.ward}</dt><dd className="mt-1 text-slate-900">{result.wardName || text.ticket.notAvailable}</dd></div>
                <div><dt className="font-semibold text-slate-700">{text.track.area}</dt><dd className="mt-1 text-slate-900">{result.area || text.ticket.notAvailable}</dd></div>
                <div><dt className="font-semibold text-slate-700">{text.track.created}</dt><dd className="mt-1 text-slate-900">{formatDate(result.createdAt)}</dd></div>
              </dl>
              <h3 className="mt-7 mb-4 text-lg font-semibold text-slate-900">{text.ticket.timeline}</h3>
              <TicketTimeline entries={result.timeline} />
            </section>
          )}
        </article>
      </section>
    </main>
  );
}
