import { useEffect, useState } from 'react';
import { requestJson } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { text } from '../i18n/en.js';
import { navigate } from '../routing.js';

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
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-start justify-between gap-4 text-white">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">{text.app.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{text.verifier.queueTitle}</h1>
            <p className="mt-2 text-sm text-slate-300">{profile.name}</p>
          </div>
          <button className="rounded-lg border border-slate-500 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800" onClick={() => signOut()} type="button">{text.auth.logOut}</button>
        </header>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-xl sm:p-7">
          <p className="text-sm text-slate-500">{text.verifier.queueDescription}</p>
          {queue.state === 'loading' && <p className="mt-6 text-sm text-slate-500" role="status">{text.verifier.loading}</p>}
          {queue.state === 'error' && <div className="mt-6 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert"><p>{queue.error || text.verifier.loadError}</p><button className="mt-3 rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800" onClick={() => setReloadKey((current) => current + 1)} type="button">{text.verifier.retry}</button></div>}
          {queue.state === 'ready' && queue.data.length === 0 && <p className="mt-6 text-sm text-slate-500">{text.verifier.empty}</p>}
          {queue.state === 'ready' && queue.data.length > 0 && (
            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
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
                      <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold"><button className="text-left text-cyan-800 underline hover:text-cyan-950" onClick={() => navigate(`/verifier/tickets/${ticket.ticketId}`)} type="button">{ticket.publicCode}<span className="sr-only">: {text.verifier.review}</span></button></td>
                      <td className="px-4 py-3 text-slate-700">{ticket.categoryName}</td>
                      <td className="px-4 py-3 text-slate-700">{ticket.wardName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(ticket.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {queue.state === 'ready' && queue.total > 0 && (
            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="text-sm text-slate-600">{text.verifier.showing} {queue.total}</p>
              <div className="flex gap-2">
                <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" disabled={!hasPreviousPage} onClick={() => setPage((current) => current - 1)} type="button">{text.verifier.previous}</button>
                <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" disabled={!hasNextPage} onClick={() => setPage((current) => current + 1)} type="button">{text.verifier.next}</button>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
