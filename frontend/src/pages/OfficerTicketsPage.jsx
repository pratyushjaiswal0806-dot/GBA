import { useEffect, useState } from 'react';
import { requestJson } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { text } from '../i18n/en.js';
import { navigate } from '../routing.js';

const statusOptions = [
  '',
  'SUBMITTED',
  'OPEN',
  'IN_PROGRESS',
  'PENDING_VERIFICATION',
  'CLOSED',
  'REOPENED',
  'REJECTED'
];

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function statusLabel(status) {
  return text.officer.statuses[status] || status;
}

export function OfficerTicketsPage() {
  const { profile, signOut } = useAuth();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [tickets, setTickets] = useState({ state: 'loading', data: [], total: 0, pageSize: 20, error: null });
  const [counts, setCounts] = useState({ state: 'loading', data: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page) });

    if (status) {
      params.set('status', status);
    }

    async function loadTickets() {
      setTickets((current) => ({ ...current, state: 'loading', error: null }));

      try {
        const data = await requestJson(`/api/officer/tickets?${params.toString()}`, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setTickets({ state: 'ready', data: data.tickets, total: data.total, pageSize: data.pageSize, error: null });
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setTickets((current) => ({ ...current, state: 'error', error: error.message }));
        }
      }
    }

    loadTickets();
    return () => controller.abort();
  }, [page, status, reloadKey]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCounts() {
      try {
        const data = await requestJson('/api/officer/tickets/counts', { signal: controller.signal });
        if (!controller.signal.aborted) {
          setCounts({ state: 'ready', data, error: null });
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setCounts({ state: 'error', data: null, error: error.message });
        }
      }
    }

    loadCounts();
    return () => controller.abort();
  }, [reloadKey]);

  const attentionCount = counts.data ? counts.data.open + counts.data.reopened : 0;
  const hasPreviousPage = page > 1;
  const hasNextPage = page * tickets.pageSize < tickets.total;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-start justify-between gap-4 text-white">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">{text.app.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{text.officer.title}</h1>
            <p className="mt-2 text-sm text-slate-300">{profile.wardName} · {profile.name}</p>
          </div>
          <button className="rounded-lg border border-slate-500 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800" onClick={() => signOut()} type="button">
            {text.auth.logOut}
          </button>
        </header>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-xl sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{text.officer.ticketListTitle}</h2>
              <p className="mt-1 text-sm text-slate-500">{text.officer.ticketListDescription}</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950" aria-label={text.officer.attentionLabel}>
              <p className="font-semibold">{text.officer.attentionLabel}</p>
              <p className="mt-1 text-2xl font-bold">{counts.state === 'ready' ? attentionCount : '—'}</p>
              {counts.state === 'ready' && <p className="mt-1 text-xs">{counts.data.open} {text.officer.open}, {counts.data.reopened} {text.officer.reopened}</p>}
              {counts.state === 'error' && <p className="mt-1 text-xs text-rose-700" role="alert">{counts.error || text.officer.loadError}</p>}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-slate-800" htmlFor="ticket-status-filter">{text.officer.filterLabel}</label>
            <select className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 sm:max-w-xs" id="ticket-status-filter" onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }} value={status}>
              {statusOptions.map((option) => (
                <option key={option || 'all'} value={option}>{option ? statusLabel(option) : text.officer.allStatuses}</option>
              ))}
            </select>
          </div>

          {tickets.state === 'loading' && <p className="mt-6 text-sm text-slate-500" role="status">{text.officer.loading}</p>}
          {tickets.state === 'error' && <div className="mt-6 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert"><p>{tickets.error || text.officer.loadError}</p><button className="mt-3 rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800" onClick={() => setReloadKey((current) => current + 1)} type="button">{text.ticket.retry}</button></div>}
          {tickets.state === 'ready' && tickets.data.length === 0 && <p className="mt-6 text-sm text-slate-500">{text.officer.empty}</p>}
          {tickets.state === 'ready' && tickets.data.length > 0 && (
            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{text.officer.code}</th>
                    <th className="px-4 py-3 font-semibold">{text.officer.category}</th>
                    <th className="px-4 py-3 font-semibold">{text.officer.status}</th>
                    <th className="px-4 py-3 font-semibold">{text.officer.created}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.data.map((ticket) => (
                    <tr key={ticket.publicCode}>
                      <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-slate-900"><button className="text-left text-cyan-800 underline hover:text-cyan-950" onClick={() => navigate(`/officer/tickets/${ticket.ticketId}`)} type="button">{ticket.publicCode}<span className="sr-only">: {text.officer.view}</span></button></td>
                      <td className="px-4 py-3 text-slate-700">{ticket.categoryName}</td>
                      <td className="px-4 py-3 text-slate-700">{statusLabel(ticket.status)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(ticket.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tickets.state === 'ready' && tickets.total > 0 && (
            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="text-sm text-slate-600">{text.officer.showing} {tickets.total}</p>
              <div className="flex gap-2">
                <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" disabled={!hasPreviousPage} onClick={() => setPage((current) => current - 1)} type="button">{text.officer.previous}</button>
                <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" disabled={!hasNextPage} onClick={() => setPage((current) => current + 1)} type="button">{text.officer.next}</button>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
