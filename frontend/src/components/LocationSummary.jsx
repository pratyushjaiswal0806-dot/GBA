import { text } from '../i18n/en.js';

function formatValue(value) {
  return value || text.report.notAvailable;
}

export function LocationSummary({ location, loading }) {
  if (loading) {
    return <p className="mt-4 text-sm text-slate-500" role="status">{text.report.locationLoading}</p>;
  }

  if (!location) {
    return null;
  }

  if (!location.inPilotArea) {
    return (
      <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
        <p className="font-semibold">{text.report.outsideTitle}</p>
        <p className="mt-1">{text.report.outsideDescription}</p>
      </div>
    );
  }

  const hasAddress = location.street || location.area;

  return (
    <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-950" role="status">
      <dl className="grid gap-2 sm:grid-cols-3">
        <div>
          <dt className="font-medium text-emerald-800">{text.report.ward}</dt>
          <dd>{location.ward.name}</dd>
        </div>
        <div>
          <dt className="font-medium text-emerald-800">{text.report.street}</dt>
          <dd>{formatValue(location.street)}</dd>
        </div>
        <div>
          <dt className="font-medium text-emerald-800">{text.report.area}</dt>
          <dd>{formatValue(location.area)}</dd>
        </div>
      </dl>
      {!hasAddress && <p className="mt-3">{text.report.wardOnly}</p>}
    </div>
  );
}
