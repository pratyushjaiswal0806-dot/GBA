import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { text } from '../i18n/en.js';

const sampleWardCenter = { lat: 12.974, lng: 77.598 };
const selectedZoom = 16;

function MapClickHandler({ onPositionChange }) {
  useMapEvents({
    click(event) {
      onPositionChange(event.latlng);
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

export function MapPicker({ position, onPositionChange }) {
  const tileUrl = import.meta.env.VITE_MAP_TILE_URL;

  if (!tileUrl) {
    return <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{text.map.configurationMissing}</p>;
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-slate-200" aria-label={text.report.mapLabel}>
        <MapContainer
          center={position || sampleWardCenter}
          className="h-80 w-full"
          scrollWheelZoom
          zoom={14}
        >
          <TileLayer attribution={text.map.attribution} url={tileUrl} />
          <MapClickHandler onPositionChange={onPositionChange} />
          <MapRecenter position={position} />
          {position && (
            <Marker
              draggable
              eventHandlers={{
                dragend(event) {
                  onPositionChange(event.target.getLatLng());
                }
              }}
              position={position}
            />
          )}
        </MapContainer>
      </div>
      <p className="mt-2 text-sm text-slate-500">{text.report.mapHelp}</p>
    </div>
  );
}
