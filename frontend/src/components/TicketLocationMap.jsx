import { useState } from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { text } from '../i18n/en.js';

const ticketZoom = 16;

export function TicketLocationMap({ lat, lng }) {
  const [tileError, setTileError] = useState(false);
  const tileUrl = import.meta.env.VITE_MAP_TILE_URL;

  if (!tileUrl) {
    return <p className="rounded bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{text.map.configurationMissing}</p>;
  }

  const position = { lat, lng };

  return (
    <div>
      <div className="map-surface overflow-hidden rounded border border-slate-300" aria-label={text.ticket.mapLabel} role="region">
      <MapContainer center={position} className="h-72 w-full" scrollWheelZoom zoom={ticketZoom}>
        <TileLayer attribution={text.map.attribution} eventHandlers={{ tileerror: () => setTileError(true) }} url={tileUrl} />
        <Marker position={position} />
      </MapContainer>
      </div>
      {tileError && <p className="portal-notice mt-2" role="status">{text.map.tilesUnavailable}</p>}
    </div>
  );
}
