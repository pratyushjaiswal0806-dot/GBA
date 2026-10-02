import { useEffect, useRef, useState } from 'react';
import { requestJson } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { TicketLocationMap } from '../components/TicketLocationMap.jsx';
import { TicketTimeline } from '../components/TicketTimeline.jsx';
import { text } from '../i18n/en.js';
import { AppLink } from '../components/AppLink.jsx';

function formatValue(value) {
  return value || text.ticket.notAvailable;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function TicketDetailPage({ ticketId }) {
  const [ticket, setTicket] = useState({ state: 'loading', data: null, error: null });
  const [isStarting, setIsStarting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const startLock = useRef(false);

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
    if (startLock.current) return;

    startLock.current = true;
    setActionError(null);
    setIsStarting(true);

    try {
      await requestJson(`/api/tickets/${ticketId}/start`, { method: 'POST' });
      setReloadKey((current) => current + 1);
    } catch (error) {
      setActionError(error.message || text.ticket.startError);
    } finally {
      startLock.current = false;
      setIsStarting(false);
    }
  }

  if (ticket.state === 'loading') return <p className="p-6 text-sm text-slate-600" role="status">{text.ticket.loading}</p>;
  if (ticket.state === 'error') {
    return (
      <main className="portal-page px-4 sm:px-6">
        <section className="mx-auto max-w-4xl">
          <AppLink className="portal-back-link" href="/officer">← {text.ticket.backToTickets}</AppLink>
          <article className="portal-card portal-card--padded mt-3">
            <p className="portal-alert" role="alert">{ticket.error || text.api.networkError}</p>
            <button className="portal-button mt-5" onClick={() => setReloadKey((current) => current + 1)} type="button">{text.ticket.retry}</button>
          </article>
        </section>
      </main>
    );
  }

  const data = ticket.data;
  const canStart = ['OPEN', 'REOPENED'].includes(data.status);
  const lastRejection = data.status === 'REOPENED' ? data.timeline.findLast((entry) => entry.toStatus === 'REOPENED') : null;
  const canSubmitReport = ['OPEN', 'IN_PROGRESS', 'REOPENED'].includes(data.status);

  return (
    <main className="portal-page px-4 sm:px-6">
      <section className="mx-auto max-w-4xl">
        <AppLink className="portal-back-link" href="/officer">← {text.ticket.backToTickets}</AppLink>
        <article className="portal-card portal-card--padded mt-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="portal-data font-mono text-sm font-bold text-emerald-800">{data.publicCode}</p>
              <h1 className="portal-section-title mt-2 text-2xl">{data.categoryName}</h1>
            </div>
            <StatusBadge status={data.status} />
          </div>

          {lastRejection && (
            <div className="portal-alert mt-5" role="alert">
              <p className="font-semibold">{text.ticket.reopenedTitle}</p>
              <p className="mt-1">{text.ticket.reopenedHelp}</p>
              {lastRejection.reason && <p className="mt-2 break-words font-semibold">{text.ticket.reason}: {lastRejection.reason}</p>}
            </div>
          )}

          <p className="portal-copy mt-5 break-words whitespace-pre-wrap">{data.description}</p>

          <dl className="portal-card--inset portal-data mt-6 grid gap-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="font-semibold text-slate-700">{text.ticket.ward}</dt><dd className="mt-1 break-words text-slate-900">{data.wardName}</dd></div>
            <div><dt className="font-semibold text-slate-700">{text.ticket.street}</dt><dd className="mt-1 break-words text-slate-900">{formatValue(data.street)}</dd></div>
            <div><dt className="font-semibold text-slate-700">{text.ticket.area}</dt><dd className="mt-1 break-words text-slate-900">{formatValue(data.area)}</dd></div>
            <div><dt className="font-semibold text-slate-700">{text.ticket.supportCount}</dt><dd className="mt-1 text-slate-900">{data.supportCount}</dd></div>
          </dl>

          <section className="mt-7" aria-labelledby="original-photo-heading">
            <h2 className="portal-section-title" id="original-photo-heading">{text.ticket.originalPhoto}</h2>
            {data.original ? <img alt={text.ticket.originalPhoto} className="mt-3 max-h-[32rem] w-full rounded-xl bg-slate-100 object-contain" height="1200" src={data.original.url} width="1600" /> : <p className="portal-empty mt-3">{text.ticket.photoUnavailable}</p>}
          </section>

          <section className="mt-7" aria-labelledby="ticket-map-heading">
            <h2 className="portal-section-title mb-3" id="ticket-map-heading">{text.ticket.mapLabel}</h2>
            <TicketLocationMap lat={data.lat} lng={data.lng} />
          </section>

          <section className="mt-7" aria-labelledby="action-reports-heading">
            <h2 className="portal-section-title" id="action-reports-heading">{text.actionReport.sectionTitle}</h2>
            {data.actionReports.length === 0 && <p className="portal-empty mt-3">{text.actionReport.empty}</p>}
            {data.actionReports.map((report) => (
              <div className="mt-3 rounded-xl border border-slate-200 p-4" key={report.id}>
                <p className="break-words whitespace-pre-wrap text-slate-700">{report.remarks}</p>
                {report.decision && <p className={`mt-2 break-words text-xs font-semibold ${report.decision === 'REJECTED' ? 'text-rose-700' : 'text-emerald-700'}`}>{report.decision === 'REJECTED' ? text.actionReport.rejectedLabel : text.actionReport.approvedLabel}{report.decisionReason ? `: ${report.decisionReason}` : ''}</p>}
                <p className="mt-2 text-xs text-slate-500">{text.actionReport.submittedBy} {report.officerName}, {formatDate(report.submittedAt)}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {report.photos.map((photo) => <img alt={text.actionReport.photoAlt} className="h-40 w-full rounded-lg bg-slate-100 object-cover" height="160" key={photo.url} loading="lazy" src={photo.url} width="240" />)}
                </div>
              </div>
            ))}
          </section>

          <section className="mt-7" aria-labelledby="ticket-timeline-heading">
            <h2 className="portal-section-title mb-4" id="ticket-timeline-heading">{text.ticket.timeline}</h2>
            <TicketTimeline entries={data.timeline} showStaffNames />
          </section>

          <div className="mt-7 flex flex-wrap gap-3">
            {canStart && <button className="portal-button" disabled={isStarting} onClick={startWork} type="button">{isStarting ? text.ticket.starting : text.ticket.startWork}</button>}
            {canSubmitReport && <AppLink className="portal-button-secondary" href={`/officer/tickets/${ticketId}/action-report`}>{text.ticket.submitActionReport}</AppLink>}
          </div>
          {actionError && <p className="portal-alert mt-4" role="alert">{actionError}</p>}
        </article>
      </section>
    </main>
  );
}
