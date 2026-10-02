import { useEffect, useState } from 'react';
import { requestJson } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { text } from '../i18n/en.js';
import { AppLink } from '../components/AppLink.jsx';

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function VerifierQueuePage() {
  const { profile, signOut } = useAuth();
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState({ state: 'loading', data: [], total: 0, pageSize: 20, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadQueue() {
      setQueue((current) => ({ ...current, state: 'loading', error: null }));

      try {
        const data = await requestJson(`/api/verifier/tickets?status=PENDING_VERIFICATION&page=${page}`, { signal: controller.signal });
        if (!controller.signal.aborted) setQueue({ state: 'ready', data: data.tickets, total: data.total, pageSize: data.pageSize, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') setQueue((current) => ({ ...current, state: 'error', error: error.message }));
      }
    }

    loadQueue();
    return () => controller.abort();
  }, [page, reloadKey]);

  const hasPreviousPage = page > 1;
  const hasNextPage = page * queue.pageSize < queue.total;

  return (
    <main className="portal-page px-4 sm:px-6">
      <section className="mx-auto max-w-5xl">
        <header className="portal-page-heading">
          <div>
            <p className="portal-kicker">{text.app.eyebrow}</p>
            <h1 className="portal-title mt-2">{text.verifier.queueTitle}</h1>
            <p className="portal-copy text-sm">{profile.name}</p>
          </div>
          <button className="portal-button-secondary" onClick={() => signOut()} type="button">{text.auth.logOut}</button>
        </header>

        <section className="portal-card portal-card--padded">
          <p className="portal-copy text-sm">{text.verifier.queueDescription}</p>
          {queue.state === 'loading' && <p className="portal-loading" role="status">{text.verifier.loading}</p>}
          {queue.state === 'error' && <div className="portal-alert mt-6" role="alert"><p>{queue.error || text.verifier.loadError}</p><button className="portal-button mt-3" onClick={() => setReloadKey((current) => current + 1)} type="button">{text.verifier.retry}</button></div>}
          {queue.state === 'ready' && queue.data.length === 0 && <p className="portal-empty mt-6">{text.verifier.empty}</p>}
          {queue.state === 'ready' && queue.data.length > 0 && (
            <div className="mt-6">
              <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
              <table className="portal-table min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{text.verifier.code}</th>
                    <th className="px-4 py-3 font-semibold">{text.verifier.category}</th>
                    <th className="px-4 py-3 font-semibold">{text.verifier.ward}</th>
                    <th className="px-4 py-3 font-semibold">{text.verifier.waitingSince}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queue.data.map((ticket) => (
                    <tr key={ticket.ticketId}>
                      <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold"><AppLink className="text-left text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950" href={`/verifier/tickets/${ticket.ticketId}`}>{ticket.publicCode}<span className="sr-only">: {text.verifier.review}</span></AppLink></td>
                      <td className="px-4 py-3 text-slate-700">{ticket.categoryName}</td>
                      <td className="px-4 py-3 text-slate-700">{ticket.wardName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(ticket.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <ul className="grid gap-3 sm:hidden" aria-label={text.verifier.queueTitle}>
                {queue.data.map((ticket) => (
                  <li className="portal-card p-4" key={`mobile-${ticket.ticketId}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <AppLink className="break-all font-mono text-sm font-bold text-emerald-800 underline underline-offset-2" href={`/verifier/tickets/${ticket.ticketId}`}>{ticket.publicCode}<span className="sr-only">: {text.verifier.review}</span></AppLink>
                        <p className="mt-2 break-words font-semibold text-slate-900">{ticket.categoryName}</p>
                        <p className="mt-1 break-words text-sm text-slate-600">{ticket.wardName}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{text.verifier.waitingSince}: {formatDate(ticket.submittedAt)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {queue.state === 'ready' && queue.total > 0 && (
            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="text-sm text-slate-600">{text.verifier.showing} {queue.total}</p>
              <div className="flex gap-2">
                <button className="portal-button-secondary" disabled={!hasPreviousPage} onClick={() => setPage((current) => current - 1)} type="button">{text.verifier.previous}</button>
                <button className="portal-button-secondary" disabled={!hasNextPage} onClick={() => setPage((current) => current + 1)} type="button">{text.verifier.next}</button>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
