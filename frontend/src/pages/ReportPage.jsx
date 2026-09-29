import { useRef, useState } from 'react';
import { requestJson } from '../api/client.js';
import { MapPicker } from '../components/MapPicker.jsx';
import { PhotoPicker } from '../components/PhotoPicker.jsx';
import { text } from '../i18n/en.js';

const descriptionLimit = 300;

function formatValue(value) {
  return value || text.report.notAvailable;
}

function LocationSummary({ location, loading }) {
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

function validateReport({ categoryCode, description, file, location, position }) {
  if (!categoryCode) return { field: 'category', message: text.report.categoryMissing };
  if (!description.trim()) return { field: 'description', message: text.report.descriptionMissing };
  if (description.length > descriptionLimit) return { field: 'description', message: text.report.descriptionTooLong };
  if (!file) return { field: 'photo', message: text.report.photoMissing };
  if (!position || !location?.inPilotArea) return { field: 'location', message: text.report.locationMissing };
  return null;
}

export function ReportPage({ categories }) {
  const [position, setPosition] = useState(null);
  const [location, setLocation] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [categoryCode, setCategoryCode] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const controllerRef = useRef(null);

  async function resolvePosition(nextPosition) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setPosition(nextPosition);
    setLocation(null);
    setFieldErrors((current) => ({ ...current, location: null }));
    setFormError(null);
    setIsResolving(true);

    try {
      const result = await requestJson('/api/locations/resolve', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextPosition)
      });

      if (!controller.signal.aborted) {
        setLocation(result);
      }
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setFormError(requestError.message || text.report.locationRequestFailed);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsResolving(false);
      }
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setFormError(text.report.unsupported);
      return;
    }

    setFormError(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsLocating(false);
        resolvePosition({ lat: coords.latitude, lng: coords.longitude });
      },
      () => {
        setIsLocating(false);
        setFormError(text.report.permissionDenied);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  async function submitReport(event) {
    event.preventDefault();
    const validationError = validateReport({ categoryCode, description, file, location, position });

    if (validationError) {
      setFieldErrors({ [validationError.field]: validationError.message });
      setFormError(null);
      return;
    }

    const formData = new FormData();
    formData.append('categoryCode', categoryCode);
    formData.append('description', description.trim());
    formData.append('lat', String(position.lat));
    formData.append('lng', String(position.lng));
    formData.append('photo', file);

    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const report = await requestJson('/api/reports', { method: 'POST', body: formData });
      setConfirmation(report);
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetReport() {
    setPosition(null);
    setLocation(null);
    setCategoryCode('');
    setDescription('');
    setFile(null);
    setFieldErrors({});
    setFormError(null);
    setConfirmation(null);
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
          <button className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-70" disabled={isLocating} onClick={useMyLocation} type="button">
            {isLocating ? text.report.locating : text.report.useMyLocation}
          </button>
          <div className="mt-5"><MapPicker onPositionChange={resolvePosition} position={position} /></div>
          <LocationSummary loading={isResolving} location={location} />
          {fieldErrors.location && <p className="mt-3 text-sm text-rose-700" role="alert">{fieldErrors.location}</p>}
        </div>
        {formError && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{formError}</p>}
        <button className="w-full rounded-lg bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-70" disabled={isSubmitting || categories.state !== 'ready'} type="submit">
          {isSubmitting ? text.report.submitting : text.report.submit}
        </button>
      </form>
    </section>
  );
}
