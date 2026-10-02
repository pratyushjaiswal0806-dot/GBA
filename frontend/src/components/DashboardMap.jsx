import { useEffect, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { text } from '../i18n/en.js';
import { chartColors, statusColors } from './charts/chartColors.js';

const defaultCenter = { lat: 12.974, lng: 77.598 };
const defaultZoom = 13;
const maxFitZoom = 16;
const fitPadding = [24, 24];
const pinRadius = 8;
const legendDotSize = 12;

function FitOnFirstPoints({ points }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (hasFitted.current || points.length === 0) return;
    map.fitBounds(points.map((point) => [point.lat, point.lng]), { padding: fitPadding, maxZoom: maxFitZoom });
    hasFitted.current = true;
  }, [map, points]);

  return null;
}

function countByStatus(points) {
  return points.reduce((counts, point) => ({ ...counts, [point.status]: (counts[point.status] ?? 0) + 1 }), {});
}

function StatusLegend({ points }) {
  const counts = countByStatus(points);

  return (
    <ul aria-label={text.dashboard.legendLabel} className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">
      {Object.keys(statusColors).filter((status) => counts[status]).map((status) => (
        <li className="flex items-center gap-2" key={status}>
          <span aria-hidden="true" className="inline-block rounded-full" style={{ width: legendDotSize, height: legendDotSize, backgroundColor: statusColors[status] }} />
          {text.officer.statuses[status]} ({counts[status]})
        </li>
      ))}
    </ul>
  );
}

export function DashboardMap({ points }) {
  const [tileError, setTileError] = useState(false);
  const tileUrl = import.meta.env.VITE_MAP_TILE_URL;

  if (!tileUrl) {
    return <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{text.map.configurationMissing}</p>;
  }

  return (
    <div>
      <div aria-label={text.dashboard.mapLabel} className="map-surface overflow-hidden rounded-xl border border-slate-200" role="region">
        <MapContainer center={defaultCenter} className="h-80 w-full" scrollWheelZoom={false} zoom={defaultZoom}>
          <TileLayer attribution={text.map.attribution} eventHandlers={{ tileerror: () => setTileError(true) }} url={tileUrl} />
          <FitOnFirstPoints points={points} />
          {points.map((point, index) => (
            <CircleMarker
              center={[point.lat, point.lng]}
              key={index}
              pathOptions={{ color: chartColors.surface, weight: 2, fillColor: statusColors[point.status], fillOpacity: 1 }}
              radius={pinRadius}
            >
              <Popup>{text.dashboard.popupStatus}: {text.officer.statuses[point.status] ?? point.status}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      {tileError && <p className="portal-notice mt-2" role="status">{text.map.tilesUnavailable}</p>}
      <StatusLegend points={points} />
      <p className="mt-2 text-sm text-slate-500">{points.length} {text.dashboard.mapCount}</p>
    </div>
  );
}
