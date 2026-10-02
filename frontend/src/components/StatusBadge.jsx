import { text } from '../i18n/en.js';

const statusTones = {
  SUBMITTED: 'status-badge--submitted',
  OPEN: 'status-badge--open',
  IN_PROGRESS: 'status-badge--progress',
  PENDING_VERIFICATION: 'status-badge--review',
  CLOSED: 'status-badge--closed',
  REOPENED: 'status-badge--reopened',
  REJECTED: 'status-badge--rejected'
};

export function StatusBadge({ status }) {
  const label = text.officer.statuses[status] || status;

  return (
    <span aria-label={`${text.officer.status}: ${label}`} className={`status-badge ${statusTones[status] || statusTones.SUBMITTED}`}>
      {label}
    </span>
  );
}
