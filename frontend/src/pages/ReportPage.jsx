import { useRef, useState } from 'react';
import { requestJson } from '../api/client.js';
import { DuplicatePrompt } from '../components/DuplicatePrompt.jsx';
import { LocationSummary } from '../components/LocationSummary.jsx';
import { MapPicker } from '../components/MapPicker.jsx';
import { PhotoPicker } from '../components/PhotoPicker.jsx';
import { useLocationPicker } from '../hooks/useLocationPicker.js';
import { text } from '../i18n/en.js';
import { prepareImageForUpload } from '../utils/imageUpload.js';

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
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-xl sm:p-7" aria-live="polite">
        <h2 className="text-xl font-semibold text-slate-900">{text.report.supportTitle}</h2>
        <p className="mt-2 text-sm text-slate-600">{text.report.supportDescription}</p>
        <p className="mt-5 text-sm font-medium text-slate-700">{text.report.ticketCode}</p>
        <p className="mt-1 break-all rounded-lg bg-cyan-50 px-4 py-3 font-mono text-xl font-bold text-cyan-950">{supportConfirmation.publicCode}</p>
        <p className="mt-4 text-sm text-slate-700">{text.report.supportCountLabel}: <span className="font-semibold">{supportConfirmation.supportCount}</span></p>
        <button className="mt-5 rounded-lg border border-cyan-700 px-4 py-2.5 text-sm font-semibold text-cyan-800 hover:bg-cyan-50" onClick={resetReport} type="button">
          {text.report.startAnother}
        </button>
      </section>
    );
  }

  if (confirmation) {
    return (
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-xl sm:p-7" aria-live="polite">
        <h2 className="text-xl font-semibold text-slate-900">{text.report.confirmationTitle}</h2>
        <p className="mt-2 text-sm text-slate-600">{text.report.confirmationDescription}</p>
        <p className="mt-5 text-sm font-medium text-slate-700">{text.report.ticketCode}</p>
        <p className="mt-1 break-all rounded-lg bg-cyan-50 px-4 py-3 font-mono text-xl font-bold text-cyan-950">{confirmation.publicCode}</p>
        <button className="mt-5 rounded-lg border border-cyan-700 px-4 py-2.5 text-sm font-semibold text-cyan-800 hover:bg-cyan-50" onClick={resetReport} type="button">
          {text.report.startAnother}
        </button>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-xl sm:p-7">
      <h2 className="text-xl font-semibold text-slate-900">{text.report.title}</h2>
      <p className="mt-1 text-sm text-slate-500">{text.report.description}</p>
      <form className="mt-5 space-y-6" onSubmit={submitReport}>
        <div>
          <label className="block text-sm font-semibold text-slate-800" htmlFor="report-category">{text.report.categoryLabel}</label>
          <select className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900" id="report-category" onChange={(event) => {
            setCategoryCode(event.target.value);
            setDuplicates(null);
            setFieldErrors((current) => ({ ...current, category: null }));
          }} value={categoryCode}>
            <option value="">{text.report.categoryPlaceholder}</option>
            {categories.data.map((category) => <option key={category.code} value={category.code}>{category.name}</option>)}
          </select>
          {fieldErrors.category && <p className="mt-2 text-sm text-rose-700" role="alert">{fieldErrors.category}</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-800" htmlFor="report-description">{text.report.descriptionLabel}</label>
          <textarea className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" id="report-description" maxLength={descriptionLimit} onChange={(event) => {
            setDescription(event.target.value);
            setFieldErrors((current) => ({ ...current, description: null }));
          }} placeholder={text.report.descriptionPlaceholder} value={description} />
          <p className="mt-1 text-right text-xs text-slate-500">{description.length}/{descriptionLimit} {text.report.characterCount}</p>
          <p className="text-sm text-slate-500">{text.report.descriptionHelp}</p>
          {fieldErrors.description && <p className="mt-2 text-sm text-rose-700" role="alert">{fieldErrors.description}</p>}
        </div>
        <div>
          <PhotoPicker file={file} onChange={(nextFile) => {
            setFile(nextFile);
            setFieldErrors((current) => ({ ...current, photo: null }));
          }} />
          {fieldErrors.photo && <p className="mt-2 text-sm text-rose-700" role="alert">{fieldErrors.photo}</p>}
        </div>
        <div>
          <button className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-70" disabled={picker.isLocating} onClick={picker.useMyLocation} type="button">
            {picker.isLocating ? text.report.locating : text.report.useMyLocation}
          </button>
          <div className="mt-5"><MapPicker onPositionChange={picker.resolvePosition} position={position} /></div>
          <LocationSummary loading={picker.isResolving} location={location} />
          {fieldErrors.location && <p className="mt-3 text-sm text-rose-700" role="alert">{fieldErrors.location}</p>}
        </div>
        {(formError || picker.error) && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{formError || picker.error}</p>}
        {duplicates && <DuplicatePrompt busyAction={busyAction} onSubmitAnyway={submitAnyway} onSupport={addSupport} tickets={duplicates} />}
        {!duplicates && (
          <button className="w-full rounded-lg bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-70" disabled={busyAction !== null || categories.state !== 'ready'} type="submit">
            {busyAction === 'check' ? text.report.checking : text.report.submit}
          </button>
        )}
      </form>
    </section>
  );
}
