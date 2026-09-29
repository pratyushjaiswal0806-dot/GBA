import { useRef, useState } from 'react';
import { requestJson } from '../api/client.js';
import { MapPicker } from '../components/MapPicker.jsx';
import { text } from '../i18n/en.js';

function formatValue(value) {
  return value || text.report.notAvailable;
}

function LocationSummary({ location, loading, error }) {
  if (loading) {
    return <p className="mt-4 text-sm text-slate-500" role="status">{text.report.locationLoading}</p>;
  }

  if (error) {
    return <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p>;
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

export function ReportPage() {
  const [position, setPosition] = useState(null);
  const [location, setLocation] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  async function resolvePosition(nextPosition) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setPosition(nextPosition);
    setLocation(null);
    setError(null);
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
        setError(requestError.message || text.report.locationRequestFailed);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsResolving(false);
      }
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError(text.report.unsupported);
      return;
    }

    setError(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsLocating(false);
        resolvePosition({ lat: coords.latitude, lng: coords.longitude });
      },
      () => {
        setIsLocating(false);
        setError(text.report.permissionDenied);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  return (
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-xl sm:p-7">
      <h2 className="text-xl font-semibold text-slate-900">{text.report.title}</h2>
      <p className="mt-1 text-sm text-slate-500">{text.report.description}</p>
      <button
        className="mt-5 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-70"
        disabled={isLocating}
        onClick={useMyLocation}
        type="button"
      >
        {isLocating ? text.report.locating : text.report.useMyLocation}
      </button>
      <div className="mt-5">
        <MapPicker onPositionChange={resolvePosition} position={position} />
      </div>
      <LocationSummary error={error} loading={isResolving} location={location} />
    </section>
  );
}
