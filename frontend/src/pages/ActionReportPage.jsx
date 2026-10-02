import { useRef, useState } from 'react';
import { requestJson } from '../api/client.js';
import { LocationSummary } from '../components/LocationSummary.jsx';
import { MapPicker } from '../components/MapPicker.jsx';
import { MultiPhotoPicker } from '../components/MultiPhotoPicker.jsx';
import { useLocationPicker } from '../hooks/useLocationPicker.js';
import { text } from '../i18n/en.js';
import { AppLink } from '../components/AppLink.jsx';
import { prepareImageForUpload } from '../utils/imageUpload.js';

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
  const submitLock = useRef(false);
  const picker = useLocationPicker({
    onPositionChange: () => setFieldErrors((current) => ({ ...current, location: null }))
  });
  const ticketPath = `/officer/tickets/${ticketId}`;

  async function submit(event) {
    event.preventDefault();
    if (submitLock.current) return;

    const problem = validate({ remarks, files, position: picker.position });

    if (problem) {
      setFieldErrors({ [problem.field]: problem.message });
      setFormError(null);
      const focusTarget = problem.field === 'photos'
        ? 'action-photos'
        : problem.field === 'location'
          ? 'action-use-location'
          : 'action-remarks';
      window.requestAnimationFrame(() => document.getElementById(focusTarget)?.focus());
      return;
    }

    setFieldErrors({});
    setFormError(null);
    submitLock.current = true;
    setIsSubmitting(true);

    try {
      const preparedFiles = await Promise.all(files.map((file) => prepareImageForUpload(file)));
      const preparedFormData = new FormData();
      preparedFormData.append('remarks', remarks.trim());
      preparedFormData.append('lat', String(picker.position.lat));
      preparedFormData.append('lng', String(picker.position.lng));
      preparedFiles.forEach((file) => preparedFormData.append('photos', file));
      await requestJson(`/api/tickets/${ticketId}/action-report`, { method: 'POST', body: preparedFormData });
      setIsSent(true);
    } catch (error) {
      setFormError(error.message || text.actionReport.submitError);
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <main className="portal-page px-4 sm:px-6">
        <section className="portal-card portal-card--padded mx-auto max-w-2xl" aria-live="polite">
          <h1 className="portal-section-title">{text.actionReport.sentTitle}</h1>
          <p className="portal-copy mt-2">{text.actionReport.sentDescription}</p>
          <AppLink className="portal-button mt-5" href={ticketPath}>{text.actionReport.backToTicket}</AppLink>
        </section>
      </main>
    );
  }

  return (
    <main className="portal-page px-4 sm:px-6">
      <section className="mx-auto max-w-2xl">
        <AppLink className="portal-back-link" href={ticketPath}>← {text.actionReport.backToTicket}</AppLink>
        <form className="portal-card portal-card--padded mt-3 space-y-6" onSubmit={submit}>
          <div>
            <p className="portal-kicker">{text.ticket.submitActionReport}</p>
            <h1 className="portal-title mt-2">{text.actionReport.title}</h1>
            <p className="portal-copy mt-2">{text.actionReport.description}</p>
          </div>
          <div>
            <label className="portal-field-label" htmlFor="action-remarks">{text.actionReport.remarksLabel}</label>
            <textarea aria-describedby={`action-remarks-count${fieldErrors.remarks ? ' action-remarks-error' : ''}`} aria-invalid={Boolean(fieldErrors.remarks)} autoComplete="off" className="portal-field mt-2 min-h-28" disabled={isSubmitting} id="action-remarks" maxLength={remarksLimit} name="remarks" onChange={(event) => {
              setRemarks(event.target.value);
              setFieldErrors((current) => ({ ...current, remarks: null }));
            }} placeholder={text.actionReport.remarksPlaceholder} required value={remarks} />
            <p className="mt-1 text-right text-sm text-slate-600" id="action-remarks-count">{remarks.length}/{remarksLimit} {text.report.characterCount}</p>
            {fieldErrors.remarks && <p className="portal-alert mt-2" id="action-remarks-error" role="alert">{fieldErrors.remarks}</p>}
          </div>
          <div>
            <MultiPhotoPicker describedBy={fieldErrors.photos ? 'action-photos-error' : undefined} disabled={isSubmitting} files={files} maxFiles={maxPhotos} onChange={(next) => {
              setFiles(next);
              setFieldErrors((current) => ({ ...current, photos: null }));
            }} />
            {fieldErrors.photos && <p className="portal-alert mt-2" id="action-photos-error" role="alert">{fieldErrors.photos}</p>}
          </div>
          <div>
            <p className="portal-field-label">{text.actionReport.locationLabel}</p>
            <button aria-describedby={fieldErrors.location ? 'action-location-error' : undefined} aria-invalid={Boolean(fieldErrors.location)} className="portal-button mt-2" disabled={picker.isLocating || isSubmitting} id="action-use-location" onClick={picker.useMyLocation} type="button">
              {picker.isLocating ? text.report.locating : text.report.useMyLocation}
            </button>
            <div className="mt-5"><MapPicker describedBy={fieldErrors.location ? 'action-location-error' : undefined} disabled={isSubmitting} onPositionChange={picker.resolvePosition} position={picker.position} /></div>
            <LocationSummary loading={picker.isResolving} location={picker.location} />
            {picker.error && <p className="portal-alert mt-3" role="alert">{picker.error}</p>}
            {fieldErrors.location && <p className="portal-alert mt-3" id="action-location-error" role="alert">{fieldErrors.location}</p>}
          </div>
          {formError && <p className="portal-alert" role="alert">{formError}</p>}
          <button className="portal-button w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? text.actionReport.submitting : text.actionReport.submit}
          </button>
        </form>
      </section>
    </main>
  );
}
