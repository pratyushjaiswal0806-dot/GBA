import { useRef, useState } from 'react';
import { requestJson } from '../api/client.js';
import { DuplicatePrompt } from '../components/DuplicatePrompt.jsx';
import { LocationSummary } from '../components/LocationSummary.jsx';
import { MapPicker } from '../components/MapPicker.jsx';
import { PhotoPicker } from '../components/PhotoPicker.jsx';
import { useLocationPicker } from '../hooks/useLocationPicker.js';
import { text } from '../i18n/en.js';
import { prepareImageForUpload } from '../utils/imageUpload.js';
import { AppLink } from '../components/AppLink.jsx';

const descriptionLimit = 300;

function validateReport({ categoryCode, description, file, location, position }) {
  if (!categoryCode) return { field: 'category', message: text.report.categoryMissing };
  if (!description.trim()) return { field: 'description', message: text.report.descriptionMissing };
  if (description.length > descriptionLimit) return { field: 'description', message: text.report.descriptionTooLong };
  if (!file) return { field: 'photo', message: text.report.photoMissing };
  if (!position || !location?.inPilotArea) return { field: 'location', message: text.report.locationMissing };
  return null;
}

export function ReportPage({ categories }) {
  const [categoryCode, setCategoryCode] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const [duplicates, setDuplicates] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [supportConfirmation, setSupportConfirmation] = useState(null);
  const actionLock = useRef(false);
  const picker = useLocationPicker({
    onPositionChange: () => {
      setFieldErrors((current) => ({ ...current, location: null }));
      setFormError(null);
      setDuplicates(null);
    }
  });
  const { position, location } = picker;

  async function findNearbyReports() {
    const query = new URLSearchParams({ lat: String(position.lat), lng: String(position.lng), category: categoryCode });
    const result = await requestJson(`/api/reports/nearby?${query}`);
    return result.tickets;
  }

  async function createReport() {
    const preparedFile = await prepareImageForUpload(file);
    const formData = new FormData();
    formData.append('categoryCode', categoryCode);
    formData.append('description', description.trim());
    formData.append('lat', String(position.lat));
    formData.append('lng', String(position.lng));
    formData.append('photo', preparedFile);

    setConfirmation(await requestJson('/api/reports', { method: 'POST', body: formData }));
  }

  async function runAction(action, work) {
    if (actionLock.current) return;

    actionLock.current = true;
    setFormError(null);
    setFieldErrors({});
    setBusyAction(action);

    try {
      await work();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      actionLock.current = false;
      setBusyAction(null);
    }
  }

  async function submitReport(event) {
    event.preventDefault();
    const validationError = validateReport({ categoryCode, description, file, location, position });

    if (validationError) {
      setFieldErrors({ [validationError.field]: validationError.message });
      setFormError(null);
      const focusTarget = validationError.field === 'location'
        ? 'report-use-location'
        : validationError.field === 'photo'
          ? 'report-photo'
          : `report-${validationError.field}`;
      window.requestAnimationFrame(() => document.getElementById(focusTarget)?.focus());
      return;
    }

    await runAction('check', async () => {
      const nearby = await findNearbyReports();

      if (nearby.length > 0) {
        setDuplicates(nearby);
        return;
      }

      await createReport();
    });
  }

  function addSupport(publicCode) {
    return runAction(`support:${publicCode}`, async () => {
      setSupportConfirmation(await requestJson(`/api/reports/${encodeURIComponent(publicCode)}/support`, { method: 'POST' }));
    });
  }

  function submitAnyway() {
    return runAction('create', createReport);
  }

  function resetReport() {
    picker.reset();
    setCategoryCode('');
    setDescription('');
    setFile(null);
    setFieldErrors({});
    setFormError(null);
    setConfirmation(null);
    setSupportConfirmation(null);
    setDuplicates(null);
  }

  if (supportConfirmation) {
    return (
      <section className="portal-card portal-card--padded" aria-live="polite">
        <p className="portal-kicker">{text.report.supportTitle}</p>
        <h2 className="portal-section-title mt-2">{text.report.supportDescription}</h2>
        <p className="mt-5 text-sm font-medium text-slate-700">{text.report.ticketCode}</p>
        <p className="portal-data mt-1 break-all rounded-lg bg-emerald-50 px-4 py-3 font-mono text-xl font-bold text-emerald-950">{supportConfirmation.publicCode}</p>
        <p className="mt-4 text-sm text-slate-700">{text.report.supportCountLabel}: <span className="font-semibold">{supportConfirmation.supportCount}</span></p>
        <button className="portal-button-secondary mt-5" onClick={resetReport} type="button">
          {text.report.startAnother}
        </button>
      </section>
    );
  }

  if (confirmation) {
    return (
      <section className="portal-card portal-card--padded" aria-live="polite">
        <p className="portal-kicker">{text.report.confirmationTitle}</p>
        <h2 className="portal-section-title mt-2">{text.report.confirmationDescription}</h2>
        <p className="mt-5 text-sm font-medium text-slate-700">{text.report.ticketCode}</p>
        <p className="portal-data mt-1 break-all rounded-lg bg-emerald-50 px-4 py-3 font-mono text-xl font-bold text-emerald-950">{confirmation.publicCode}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <AppLink className="portal-button" href={`/track?code=${encodeURIComponent(confirmation.publicCode)}`}>{text.report.trackThisReport}</AppLink>
          <button className="portal-button-secondary" onClick={resetReport} type="button">
          {text.report.startAnother}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="portal-card portal-card--padded min-w-0">
      <p className="portal-kicker">{text.portal.report}</p>
      <h2 className="portal-section-title mt-2">{text.report.title}</h2>
      <p className="portal-copy mt-1 text-sm">{text.report.description}</p>
      <form className="mt-5 space-y-6" onSubmit={submitReport}>
        <div>
          <label className="portal-field-label" htmlFor="report-category">{text.report.categoryLabel}</label>
          <select aria-invalid={Boolean(fieldErrors.category)} aria-describedby={fieldErrors.category ? 'report-category-error' : undefined} className="portal-field mt-2" disabled={categories.state !== 'ready' || busyAction !== null} id="report-category" name="categoryCode" onChange={(event) => {
            setCategoryCode(event.target.value);
            setDuplicates(null);
            setFieldErrors((current) => ({ ...current, category: null }));
          }} required value={categoryCode}>
            <option value="">{text.report.categoryPlaceholder}</option>
            {categories.data.map((category) => <option key={category.code} value={category.code}>{category.name}</option>)}
          </select>
          {categories.state === 'loading' && <p className="mt-2 text-sm text-slate-500" role="status">{text.categories.loading}</p>}
          {categories.state === 'error' && <p className="portal-alert mt-2" role="alert">{categories.error || text.categories.error}</p>}
          {fieldErrors.category && <p className="portal-alert mt-2" id="report-category-error" role="alert">{fieldErrors.category}</p>}
        </div>
        <div>
          <label className="portal-field-label" htmlFor="report-description">{text.report.descriptionLabel}</label>
          <textarea aria-describedby={`report-description-help report-description-count${fieldErrors.description ? ' report-description-error' : ''}`} aria-invalid={Boolean(fieldErrors.description)} autoComplete="off" className="portal-field mt-2 min-h-28" disabled={busyAction !== null} id="report-description" maxLength={descriptionLimit} name="description" onChange={(event) => {
            setDescription(event.target.value);
            setFieldErrors((current) => ({ ...current, description: null }));
          }} placeholder={text.report.descriptionPlaceholder} required value={description} />
          <p className="mt-1 text-right text-xs text-slate-500" id="report-description-count">{description.length}/{descriptionLimit} {text.report.characterCount}</p>
          <p className="text-sm text-slate-500" id="report-description-help">{text.report.descriptionHelp}</p>
          {fieldErrors.description && <p className="portal-alert mt-2" id="report-description-error" role="alert">{fieldErrors.description}</p>}
        </div>
        <div>
          <PhotoPicker describedBy={fieldErrors.photo ? 'report-photo-error' : undefined} disabled={busyAction !== null} file={file} onChange={(nextFile) => {
            setFile(nextFile);
            setFieldErrors((current) => ({ ...current, photo: null }));
          }} />
          {fieldErrors.photo && <p className="portal-alert mt-2" id="report-photo-error" role="alert">{fieldErrors.photo}</p>}
        </div>
        <div>
          <p className="portal-field-label">{text.report.locationHeading}</p>
          <button aria-describedby={fieldErrors.location ? 'report-location-error' : undefined} aria-invalid={Boolean(fieldErrors.location)} className="portal-button mt-2" disabled={picker.isLocating || busyAction !== null} id="report-use-location" onClick={picker.useMyLocation} type="button">
            {picker.isLocating ? text.report.locating : text.report.useMyLocation}
          </button>
          <div className="mt-5"><MapPicker describedBy={fieldErrors.location ? 'report-location-error' : undefined} disabled={busyAction !== null} onPositionChange={picker.resolvePosition} position={position} /></div>
          <LocationSummary loading={picker.isResolving} location={location} />
          {fieldErrors.location && <p className="portal-alert mt-3" id="report-location-error" role="alert">{fieldErrors.location}</p>}
        </div>
        {(formError || picker.error) && <p className="portal-alert" role="alert">{formError || picker.error}</p>}
        {duplicates && <DuplicatePrompt busyAction={busyAction} onSubmitAnyway={submitAnyway} onSupport={addSupport} tickets={duplicates} />}
        {!duplicates && (
          <button className="portal-button w-full" disabled={busyAction !== null || categories.state !== 'ready'} type="submit">
            {busyAction === 'check' ? text.report.checking : text.report.submit}
          </button>
        )}
      </form>
    </section>
  );
}
