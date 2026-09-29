import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { text } from '../i18n/en.js';

const ticketZoom = 16;

export function TicketLocationMap({ lat, lng }) {
  const tileUrl = import.meta.env.VITE_MAP_TILE_URL;

  if (!tileUrl) {
    return <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{text.map.configurationMissing}</p>;
  }

  const position = { lat, lng };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200" aria-label={text.ticket.mapLabel}>
      <MapContainer center={position} className="h-72 w-full" scrollWheelZoom zoom={ticketZoom}>
        <TileLayer attribution={text.map.attribution} url={tileUrl} />
        <Marker position={position} />
      </MapContainer>
    </div>
  );
}
