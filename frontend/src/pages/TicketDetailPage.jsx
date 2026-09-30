import { useEffect, useState } from 'react';
import { requestJson } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { TicketLocationMap } from '../components/TicketLocationMap.jsx';
import { TicketTimeline } from '../components/TicketTimeline.jsx';
import { text } from '../i18n/en.js';
import { navigate } from '../routing.js';

function formatValue(value) {
  return value || text.ticket.notAvailable;
}

export function TicketDetailPage({ ticketId }) {
  const [ticket, setTicket] = useState({ state: 'loading', data: null, error: null });
  const [isStarting, setIsStarting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTicket() {
      setTicket({ state: 'loading', data: null, error: null });

      try {
        const data = await requestJson(`/api/tickets/${ticketId}`, { signal: controller.signal });
        if (!controller.signal.aborted) setTicket({ state: 'ready', data, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') setTicket({ state: 'error', data: null, error: error.message });
      }
    }

    loadTicket();
    return () => controller.abort();
  }, [ticketId, reloadKey]);

  async function startWork() {
    setActionError(null);
    setIsStarting(true);

    try {
      await requestJson(`/api/tickets/${ticketId}/start`, { method: 'POST' });
      setReloadKey((current) => current + 1);
    } catch (error) {
      setActionError(error.message || text.ticket.startError);
    } finally {
      setIsStarting(false);
    }
  }

  if (ticket.state === 'loading') return <p className="p-6 text-sm text-slate-600" role="status">{text.ticket.loading}</p>;
  if (ticket.state === 'error') return <p className="p-6 text-sm text-rose-700" role="alert">{ticket.error}</p>;

  const data = ticket.data;
  const canStart = ['OPEN', 'REOPENED'].includes(data.status);
  const canSubmitReport = ['OPEN', 'IN_PROGRESS', 'REOPENED'].includes(data.status);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-4xl">
        <button className="text-sm font-semibold text-cyan-200 hover:text-white" onClick={() => navigate('/officer')} type="button">← {text.ticket.backToTickets}</button>
        <article className="mt-4 rounded-2xl bg-white p-5 shadow-xl sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-sm font-semibold text-cyan-800">{data.publicCode}</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">{data.categoryName}</h1>
            </div>
            <StatusBadge status={data.status} />
          </div>

          <p className="mt-5 whitespace-pre-wrap text-slate-700">{data.description}</p>

          <div className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
            <div><p className="font-semibold text-slate-700">{text.ticket.ward}</p><p className="mt-1 text-slate-900">{data.wardName}</p></div>
            <div><p className="font-semibold text-slate-700">{text.ticket.street}</p><p className="mt-1 text-slate-900">{formatValue(data.street)}</p></div>
            <div><p className="font-semibold text-slate-700">{text.ticket.area}</p><p className="mt-1 text-slate-900">{formatValue(data.area)}</p></div>
          </div>

          <section className="mt-7">
            <h2 className="text-lg font-semibold text-slate-900">{text.ticket.originalPhoto}</h2>
            {data.original ? <img alt={text.ticket.originalPhoto} className="mt-3 max-h-[32rem] w-full rounded-xl object-contain" src={data.original.url} /> : <p className="mt-3 text-sm text-slate-500">{text.ticket.photoUnavailable}</p>}
          </section>

          <section className="mt-7">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">{text.ticket.mapLabel}</h2>
            <TicketLocationMap lat={data.lat} lng={data.lng} />
          </section>

          {data.actionReports.length > 0 && (
            <section className="mt-7">
              <h2 className="text-lg font-semibold text-slate-900">{text.actionReport.sectionTitle}</h2>
              {data.actionReports.map((report) => (
                <div className="mt-3 rounded-xl border border-slate-200 p-4" key={report.id}>
                  <p className="whitespace-pre-wrap text-slate-700">{report.remarks}</p>
                  <p className="mt-2 text-xs text-slate-500">{text.actionReport.submittedBy} {report.officerName}, {new Date(report.submittedAt).toLocaleString()}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {report.photos.map((photo) => <img alt={text.actionReport.photoAlt} className="h-40 w-full rounded-lg object-cover" key={photo.url} src={photo.url} />)}
                  </div>
                </div>
              ))}
            </section>
          )}

          <section className="mt-7">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{text.ticket.timeline}</h2>
            <TicketTimeline entries={data.timeline} showStaffNames />
          </section>

          {canStart && <button className="mt-7 rounded-lg bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-70" disabled={isStarting} onClick={startWork} type="button">{isStarting ? text.ticket.starting : text.ticket.startWork}</button>}
          {canSubmitReport && <button className="mt-7 ml-0 rounded-lg border border-cyan-700 px-4 py-3 text-sm font-semibold text-cyan-800 hover:bg-cyan-50 sm:ml-3" onClick={() => navigate(`/officer/tickets/${ticketId}/action-report`)} type="button">{text.ticket.submitActionReport}</button>}
          {actionError && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{actionError}</p>}
        </article>
      </section>
    </main>
  );
}
