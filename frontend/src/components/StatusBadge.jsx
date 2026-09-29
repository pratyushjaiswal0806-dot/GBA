import { text } from '../i18n/en.js';

const statusTones = {
  SUBMITTED: 'bg-slate-100 text-slate-700',
  OPEN: 'bg-cyan-100 text-cyan-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-900',
  PENDING_VERIFICATION: 'bg-violet-100 text-violet-800',
  CLOSED: 'bg-emerald-100 text-emerald-800',
  REOPENED: 'bg-rose-100 text-rose-800',
  REJECTED: 'bg-slate-200 text-slate-700'
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusTones[status] || statusTones.SUBMITTED}`}>
      {text.officer.statuses[status] || status}
    </span>
  );
}
