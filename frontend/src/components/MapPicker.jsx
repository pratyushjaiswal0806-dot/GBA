import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { text } from '../i18n/en.js';

const sampleWardCenter = { lat: 12.974, lng: 77.598 };
const selectedZoom = 16;

function MapClickHandler({ disabled, onPositionChange }) {
  useMapEvents({
    click(event) {
      if (!disabled) onPositionChange(event.latlng);
    }
  });

  return null;
}

function MapRecenter({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, selectedZoom);
    }
  }, [map, position]);

  return null;
}

export function MapPicker({ position, onPositionChange, disabled = false, describedBy }) {
  const [tileError, setTileError] = useState(false);
  const tileUrl = import.meta.env.VITE_MAP_TILE_URL;

  if (!tileUrl) {
    return <p className="rounded bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{text.map.configurationMissing}</p>;
  }

  return (
    <div>
      <div aria-describedby={describedBy} aria-label={text.report.mapLabel} className={`map-surface overflow-hidden border border-slate-400 ${disabled ? 'map-surface--disabled' : ''}`} role="region">
        <MapContainer
          center={position || sampleWardCenter}
          className="map-height w-full"
          scrollWheelZoom
          zoom={14}
        >
          <TileLayer attribution={text.map.attribution} eventHandlers={{ tileerror: () => setTileError(true) }} url={tileUrl} />
          <MapClickHandler disabled={disabled} onPositionChange={onPositionChange} />
          <MapRecenter position={position} />
          {position && (
            <Marker
              draggable={!disabled}
              eventHandlers={{
                dragend(event) {
                  if (!disabled) onPositionChange(event.target.getLatLng());
                }
              }}
              position={position}
            />
          )}
        </MapContainer>
      </div>
      {tileError && <p className="portal-notice mt-2" role="status">{text.map.tilesUnavailable}</p>}
      <p className="mt-2 text-sm text-slate-600">{text.report.mapHelp}</p>
    </div>
  );
}
