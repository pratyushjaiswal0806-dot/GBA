import { text } from '../i18n/en.js';

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export function DuplicatePrompt({ tickets, busyAction, onSupport, onSubmitAnyway }) {
  const isBusy = busyAction !== null;

  return (
    <section aria-live="polite" className="duplicate-prompt">
      <h3 className="portal-section-title">{text.report.duplicateTitle}</h3>
      <p className="mt-1 text-sm text-amber-900">{text.report.duplicateDescription}</p>
      <ul className="mt-4 space-y-3">
        {tickets.map((ticket) => (
          <li className="portal-card p-4 text-sm text-slate-700" key={ticket.publicCode}>
            <p className="break-words font-semibold text-slate-900">{ticket.categoryName} · {text.officer.statuses[ticket.status] ?? ticket.status}</p>
            <p className="mt-1 break-words">{[ticket.street, ticket.area, ticket.wardName].filter(Boolean).join(', ')}</p>
            <p className="mt-1 text-slate-500">
              {ticket.distanceMeters} {text.map.metersShort} {text.report.duplicateDistance} · {text.report.duplicateReported} {formatDate(ticket.createdAt)} · {text.report.duplicatePeople}: {ticket.supportCount}
            </p>
            <button
              className="portal-button mt-3 w-full sm:w-auto"
              disabled={isBusy}
              onClick={() => onSupport(ticket.publicCode)}
              type="button"
            >
              {busyAction === `support:${ticket.publicCode}` ? text.report.addingSupport : text.report.addSupport}
            </button>
          </li>
        ))}
      </ul>
      <button
        className="portal-button-secondary mt-4 w-full"
        disabled={isBusy}
        onClick={onSubmitAnyway}
        type="button"
      >
        {busyAction === 'create' ? text.report.submitting : text.report.submitAnyway}
      </button>
    </section>
  );
}
