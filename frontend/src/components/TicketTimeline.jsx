import { text } from '../i18n/en.js';

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function statusName(status) {
  return text.officer.statuses[status] || status;
}

export function TicketTimeline({ entries, showStaffNames = false }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-600">{text.ticket.timelineEmpty}</p>;
  }

  return (
    <ol className="ticket-timeline">
      {entries.map((entry, index) => (
        <li key={`${entry.createdAt}-${entry.toStatus}-${index}`}>
          <p className="font-semibold text-slate-900">
            {entry.fromStatus ? `${statusName(entry.fromStatus)} → ${statusName(entry.toStatus)}` : text.ticket.created}
          </p>
          <time className="mt-1 block text-sm text-slate-600" dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
          {showStaffNames && entry.reason && <p className="mt-1 break-words text-sm text-rose-700">{text.ticket.reason}: {entry.reason}</p>}
          {showStaffNames && entry.changedByName && <p className="mt-1 text-sm text-slate-600">{text.ticket.by} {entry.changedByName}</p>}
        </li>
      ))}
    </ol>
  );
}
