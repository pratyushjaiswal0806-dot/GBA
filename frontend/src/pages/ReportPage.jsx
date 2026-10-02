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
import { TicketCode } from '../components/TicketCode.jsx';
import { Icon, categoryIcons } from '../components/Icon.jsx';

const descriptionLimit = 300;

const focusTargets = { category: 'report-category', photo: 'report-photo', location: 'report-use-location', description: 'report-description' };

function focusField(field) {
  window.requestAnimationFrame(() => document.getElementById(focusTargets[field])?.focus());
}

function validateReport({ categoryCode, description, file, location, position }) {
  if (!categoryCode) return { field: 'category', message: text.report.categoryMissing };
  if (!file) return { field: 'photo', message: text.report.photoMissing };
  if (!position || !location?.inPilotArea) return { field: 'location', message: text.report.locationMissing };
  if (!description.trim()) return { field: 'description', message: text.report.descriptionMissing };
  if (description.length > descriptionLimit) return { field: 'description', message: text.report.descriptionTooLong };
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
      window.requestAnimationFrame(() => document.getElementById('report-error-summary')?.focus());
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
        <span className="success-mark"><Icon name="check" size={28} /></span>
        <p className="portal-kicker">{text.report.supportTitle}</p>
        <h2 className="portal-section-title mt-2">{text.report.supportDescription}</h2>
        <TicketCode code={supportConfirmation.publicCode} />
        <p className="mt-4">{text.report.supportCountLabel}: <span className="font-bold">{supportConfirmation.supportCount}</span></p>
        <button className="portal-button-secondary mt-5" onClick={resetReport} type="button">
          {text.report.startAnother}
        </button>
      </section>
    );
  }

  if (confirmation) {
    return (
      <section className="portal-card portal-card--padded" aria-live="polite">
        <span className="success-mark"><Icon name="check" size={28} /></span>
        <p className="portal-kicker">{text.report.confirmationTitle}</p>
        <h2 className="portal-section-title mt-2">{text.report.confirmationDescription}</h2>
        <TicketCode code={confirmation.publicCode} />
        <div className="mt-5 flex flex-wrap gap-3">
          <AppLink className="portal-button" href={`/track?code=${encodeURIComponent(confirmation.publicCode)}`}>{text.report.trackThisReport}</AppLink>
          <button className="portal-button-secondary" onClick={resetReport} type="button">
            {text.report.startAnother}
          </button>
        </div>
      </section>
    );
  }

  const stepDone = {
    category: Boolean(categoryCode),
    photo: Boolean(file),
    location: Boolean(position && location?.inPilotArea),
    description: Boolean(description.trim())
  };
  const errorEntries = Object.entries(fieldErrors).filter(([, message]) => message);

  return (
    <section className="portal-card portal-card--padded report-card min-w-0" id="report">
      <p className="portal-kicker">{text.portal.report}</p>
      <h2 className="portal-section-title mt-2">{text.report.title}</h2>
      <p className="portal-copy mt-1">{text.report.description}</p>
      <form className="mt-5" noValidate onSubmit={submitReport}>
        {errorEntries.length > 0 && (
          <div className="portal-alert mb-5" id="report-error-summary" role="alert" tabIndex="-1">
            <p className="font-bold">{text.report.errorSummaryTitle}</p>
            <ul className="mt-1 list-disc pl-5">
              {errorEntries.map(([field, message]) => (
                <li key={field}>
                  <a href={`#${focusTargets[field]}`} onClick={(event) => {
                    event.preventDefault();
                    focusField(field);
                  }}>{message}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <fieldset aria-describedby={fieldErrors.category ? 'report-category-error' : undefined} className="report-step" disabled={categories.state !== 'ready' || busyAction !== null}>
          <legend className="report-step__title"><span aria-hidden="true" className="report-step__number" data-done={stepDone.category}>{stepDone.category ? <Icon name="check" size={16} /> : 1}</span>{text.report.stepCategory}</legend>
          <p className="portal-field-label">{text.report.categoryLabel}</p>
          <div className="category-cards mt-2">
            {categories.data.map((category, index) => (
              <label className="category-card" key={category.code}>
                <input
                  checked={categoryCode === category.code}
                  id={index === 0 ? 'report-category' : undefined}
                  name="categoryCode"
                  onChange={() => {
                    setCategoryCode(category.code);
                    setDuplicates(null);
                    setFieldErrors((current) => ({ ...current, category: null }));
                  }}
                  type="radio"
                  value={category.code}
                />
                <span className="icon-chip"><Icon name={categoryIcons[category.code] ?? 'pin'} /></span>
                <span>{category.name}</span>
                <span aria-hidden="true" className="category-card__check"><Icon name="check" size={14} /></span>
              </label>
            ))}
          </div>
          {categories.state === 'loading' && <p className="mt-2 text-slate-600" role="status">{text.categories.loading}</p>}
          {categories.state === 'error' && <p className="portal-alert mt-2">{categories.error || text.categories.error}</p>}
          {fieldErrors.category && <p className="portal-alert mt-2" id="report-category-error">{fieldErrors.category}</p>}
        </fieldset>
        <div className="report-step">
          <h3 className="report-step__title"><span aria-hidden="true" className="report-step__number" data-done={stepDone.photo}>{stepDone.photo ? <Icon name="check" size={16} /> : 2}</span>{text.report.stepPhoto}</h3>
          <PhotoPicker describedBy={fieldErrors.photo ? 'report-photo-error' : undefined} disabled={busyAction !== null} file={file} onChange={(nextFile) => {
            setFile(nextFile);
            setFieldErrors((current) => ({ ...current, photo: null }));
          }} />
          {fieldErrors.photo && <p className="portal-alert mt-2" id="report-photo-error">{fieldErrors.photo}</p>}
        </div>
        <div className="report-step">
          <h3 className="report-step__title"><span aria-hidden="true" className="report-step__number" data-done={stepDone.location}>{stepDone.location ? <Icon name="check" size={16} /> : 3}</span>{text.report.stepLocation}</h3>
          <p className="portal-field-label">{text.report.locationHeading}</p>
          <button aria-describedby={fieldErrors.location ? 'report-location-error' : undefined} aria-invalid={Boolean(fieldErrors.location)} className="portal-button mt-2 w-full sm:w-auto" disabled={picker.isLocating || busyAction !== null} id="report-use-location" onClick={picker.useMyLocation} type="button">
            <Icon name="pin" size={18} />{picker.isLocating ? text.report.locating : text.report.useMyLocation}
          </button>
          <div className="mt-4"><MapPicker describedBy={fieldErrors.location ? 'report-location-error' : undefined} disabled={busyAction !== null} onPositionChange={picker.resolvePosition} position={position} /></div>
          <LocationSummary loading={picker.isResolving} location={location} />
          {fieldErrors.location && <p className="portal-alert mt-3" id="report-location-error">{fieldErrors.location}</p>}
        </div>
        <div className="report-step">
          <h3 className="report-step__title"><span aria-hidden="true" className="report-step__number" data-done={stepDone.description}>{stepDone.description ? <Icon name="check" size={16} /> : 4}</span>{text.report.stepDescription}</h3>
          <label className="portal-field-label" htmlFor="report-description">{text.report.descriptionLabel}</label>
          <textarea aria-describedby={`report-description-help report-description-count${fieldErrors.description ? ' report-description-error' : ''}`} aria-invalid={Boolean(fieldErrors.description)} autoComplete="off" className="portal-field mt-2 min-h-32" disabled={busyAction !== null} id="report-description" maxLength={descriptionLimit} name="description" onChange={(event) => {
            setDescription(event.target.value);
            setFieldErrors((current) => ({ ...current, description: null }));
          }} placeholder={text.report.descriptionPlaceholder} required value={description} />
          <p className="mt-1 text-right text-sm text-slate-600" id="report-description-count">{description.length}/{descriptionLimit} {text.report.characterCount}</p>
          <p className="text-slate-600" id="report-description-help">{text.report.descriptionHelp}</p>
          {fieldErrors.description && <p className="portal-alert mt-2" id="report-description-error">{fieldErrors.description}</p>}
        </div>
        {(formError || picker.error) && <p className="portal-alert mb-4" role="alert">{formError || picker.error}</p>}
        {duplicates && <DuplicatePrompt busyAction={busyAction} onSubmitAnyway={submitAnyway} onSupport={addSupport} tickets={duplicates} />}
        {!duplicates && (
          <div className="action-bar">
            <button className="portal-button w-full" disabled={busyAction !== null || categories.state !== 'ready'} type="submit">
              {busyAction === 'check' ? text.report.checking : text.report.submit}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
