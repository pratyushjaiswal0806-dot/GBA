import { useEffect, useState } from 'react';
import { requestJson } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { text } from '../i18n/en.js';
import { AppLink } from '../components/AppLink.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';

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
    <main className="portal-page px-4 sm:px-6">
      <section className="mx-auto max-w-5xl">
        <header className="portal-page-heading">
          <div>
            <p className="portal-kicker">{text.app.eyebrow}</p>
            <h1 className="portal-title mt-2">{text.officer.title}</h1>
            <p className="portal-copy text-sm">{profile.wardName} · {profile.name}</p>
          </div>
          <button className="portal-button-secondary" onClick={() => signOut()} type="button">
            {text.auth.logOut}
          </button>
        </header>

        <section className="portal-card portal-card--padded">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="portal-section-title">{text.officer.ticketListTitle}</h2>
              <p className="portal-copy mt-1 text-sm">{text.officer.ticketListDescription}</p>
            </div>
            <div className="portal-notice min-w-44" aria-label={text.officer.attentionLabel}>
              <p className="font-semibold">{text.officer.attentionLabel}</p>
              <p className="portal-data mt-1 text-2xl font-extrabold">{counts.state === 'ready' ? attentionCount : '—'}</p>
              {counts.state === 'ready' && <p className="mt-1 text-xs">{counts.data.open} {text.officer.open}, {counts.data.reopened} {text.officer.reopened}</p>}
              {counts.state === 'error' && <p className="mt-1 text-xs" role="alert">{counts.error || text.officer.loadError}</p>}
            </div>
          </div>

          <div className="mt-6">
            <label className="portal-field-label" htmlFor="ticket-status-filter">{text.officer.filterLabel}</label>
            <select className="portal-field mt-2 sm:max-w-xs" id="ticket-status-filter" name="status" onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }} value={status}>
              {statusOptions.map((option) => (
                <option key={option || 'all'} value={option}>{option ? statusLabel(option) : text.officer.allStatuses}</option>
              ))}
            </select>
          </div>

          {tickets.state === 'loading' && <p className="portal-loading" role="status">{text.officer.loading}</p>}
          {tickets.state === 'error' && <div className="portal-alert mt-6" role="alert"><p>{tickets.error || text.officer.loadError}</p><button className="portal-button mt-3" onClick={() => setReloadKey((current) => current + 1)} type="button">{text.ticket.retry}</button></div>}
          {tickets.state === 'ready' && tickets.data.length === 0 && <p className="portal-empty mt-6">{text.officer.empty}</p>}
          {tickets.state === 'ready' && tickets.data.length > 0 && (
            <div className="mt-6">
              <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
              <table className="portal-table min-w-full divide-y divide-slate-200 text-left text-sm">
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
                      <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-slate-900"><AppLink className="text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950" href={`/officer/tickets/${ticket.ticketId}`}>{ticket.publicCode}<span className="sr-only">: {text.officer.view}</span></AppLink></td>
                      <td className="px-4 py-3 text-slate-700">{ticket.categoryName}</td>
                      <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(ticket.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <ul className="grid gap-3 sm:hidden" aria-label={text.officer.ticketListTitle}>
                {tickets.data.map((ticket) => (
                  <li className="portal-card p-4" key={`mobile-${ticket.publicCode}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <AppLink className="break-all font-mono text-sm font-bold text-emerald-800 underline underline-offset-2" href={`/officer/tickets/${ticket.ticketId}`}>{ticket.publicCode}<span className="sr-only">: {text.officer.view}</span></AppLink>
                        <p className="mt-2 break-words font-semibold text-slate-900">{ticket.categoryName}</p>
                      </div>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{text.officer.created}: {formatDate(ticket.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tickets.state === 'ready' && tickets.total > 0 && (
            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="text-sm text-slate-600">{text.officer.showing} {tickets.total}</p>
              <div className="flex gap-2">
                <button className="portal-button-secondary" disabled={!hasPreviousPage} onClick={() => setPage((current) => current - 1)} type="button">{text.officer.previous}</button>
                <button className="portal-button-secondary" disabled={!hasNextPage} onClick={() => setPage((current) => current + 1)} type="button">{text.officer.next}</button>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
