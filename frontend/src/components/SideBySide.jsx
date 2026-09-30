import { text } from '../i18n/en.js';

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : text.ticket.notAvailable;
}

function formatPlace(lat, lng) {
  return lat === null || lng === null ? text.ticket.notAvailable : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function Side({ title, photos, alt, capturedAt, lat, lng }) {
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3">
        {photos.length === 0 && <p className="text-sm text-slate-500">{text.verifier.photoUnavailable}</p>}
        {photos.map((photo) => <img alt={alt} className="max-h-96 w-full rounded-lg object-contain" key={photo.url} src={photo.url} />)}
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div><dt className="font-semibold text-slate-700">{text.verifier.time}</dt><dd className="text-slate-900">{formatDate(capturedAt)}</dd></div>
        <div><dt className="font-semibold text-slate-700">{text.verifier.location}</dt><dd className="font-mono text-slate-900">{formatPlace(lat, lng)}</dd></div>
      </dl>
    </section>
  );
}

export function SideBySide({ original, action }) {
  const originalPhotos = original.url ? [{ url: original.url }] : [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Side alt={text.verifier.beforeAlt} capturedAt={original.capturedAt} lat={original.lat} lng={original.lng} photos={originalPhotos} title={text.verifier.before} />
      <Side alt={text.verifier.afterAlt} capturedAt={action.capturedAt} lat={action.lat} lng={action.lng} photos={action.photos} title={text.verifier.after} />
    </div>
  );
}
