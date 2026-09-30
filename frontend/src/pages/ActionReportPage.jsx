import { useState } from 'react';
import { requestJson } from '../api/client.js';
import { LocationSummary } from '../components/LocationSummary.jsx';
import { MapPicker } from '../components/MapPicker.jsx';
import { MultiPhotoPicker } from '../components/MultiPhotoPicker.jsx';
import { useLocationPicker } from '../hooks/useLocationPicker.js';
import { text } from '../i18n/en.js';
import { navigate } from '../routing.js';

const remarksLimit = 500;
const maxPhotos = 3;

function validate({ remarks, files, position }) {
  if (!remarks.trim()) return { field: 'remarks', message: text.actionReport.remarksMissing };
  if (remarks.length > remarksLimit) return { field: 'remarks', message: text.actionReport.remarksTooLong };
  if (files.length === 0) return { field: 'photos', message: text.actionReport.photosMissing };
  if (!position) return { field: 'location', message: text.actionReport.locationMissing };
  return null;
}

export function ActionReportPage({ ticketId }) {
  const [remarks, setRemarks] = useState('');
  const [files, setFiles] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const picker = useLocationPicker({
    onPositionChange: () => setFieldErrors((current) => ({ ...current, location: null }))
  });
  const ticketPath = `/officer/tickets/${ticketId}`;

  async function submit(event) {
    event.preventDefault();
    const problem = validate({ remarks, files, position: picker.position });

    if (problem) {
      setFieldErrors({ [problem.field]: problem.message });
      setFormError(null);
      return;
    }

    const formData = new FormData();
    formData.append('remarks', remarks.trim());
    formData.append('lat', String(picker.position.lat));
    formData.append('lng', String(picker.position.lng));
    files.forEach((file) => formData.append('photos', file));

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      await requestJson(`/api/tickets/${ticketId}/action-report`, { method: 'POST', body: formData });
      setIsSent(true);
    } catch (error) {
      setFormError(error.message || text.actionReport.submitError);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6">
        <section className="mx-auto max-w-2xl rounded-2xl bg-white p-5 shadow-xl sm:p-7" aria-live="polite">
          <h1 className="text-xl font-semibold text-slate-900">{text.actionReport.sentTitle}</h1>
          <p className="mt-2 text-sm text-slate-600">{text.actionReport.sentDescription}</p>
          <button className="mt-5 rounded-lg bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-800" onClick={() => navigate(ticketPath)} type="button">{text.actionReport.backToTicket}</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-2xl">
        <button className="text-sm font-semibold text-cyan-200 hover:text-white" onClick={() => navigate(ticketPath)} type="button">← {text.actionReport.backToTicket}</button>
        <form className="mt-4 space-y-6 rounded-2xl bg-white p-5 shadow-xl sm:p-7" onSubmit={submit}>
          <div>
            <h1 className="text-xl font-semibold">{text.actionReport.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{text.actionReport.description}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800" htmlFor="action-remarks">{text.actionReport.remarksLabel}</label>
            <textarea className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2" id="action-remarks" maxLength={remarksLimit} onChange={(event) => {
              setRemarks(event.target.value);
              setFieldErrors((current) => ({ ...current, remarks: null }));
            }} placeholder={text.actionReport.remarksPlaceholder} value={remarks} />
            <p className="mt-1 text-right text-xs text-slate-500">{remarks.length}/{remarksLimit} {text.report.characterCount}</p>
            {fieldErrors.remarks && <p className="mt-2 text-sm text-rose-700" role="alert">{fieldErrors.remarks}</p>}
          </div>
          <div>
            <MultiPhotoPicker files={files} maxFiles={maxPhotos} onChange={(next) => {
              setFiles(next);
              setFieldErrors((current) => ({ ...current, photos: null }));
            }} />
            {fieldErrors.photos && <p className="mt-2 text-sm text-rose-700" role="alert">{fieldErrors.photos}</p>}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{text.actionReport.locationLabel}</p>
            <button className="mt-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-70" disabled={picker.isLocating} onClick={picker.useMyLocation} type="button">
              {picker.isLocating ? text.report.locating : text.report.useMyLocation}
            </button>
            <div className="mt-5"><MapPicker onPositionChange={picker.resolvePosition} position={picker.position} /></div>
            <LocationSummary loading={picker.isResolving} location={picker.location} />
            {picker.error && <p className="mt-3 text-sm text-rose-700" role="alert">{picker.error}</p>}
            {fieldErrors.location && <p className="mt-3 text-sm text-rose-700" role="alert">{fieldErrors.location}</p>}
          </div>
          {formError && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{formError}</p>}
          <button className="w-full rounded-lg bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-70" disabled={isSubmitting} type="submit">
            {isSubmitting ? text.actionReport.submitting : text.actionReport.submit}
          </button>
        </form>
      </section>
    </main>
  );
}
