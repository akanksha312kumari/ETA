import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Animated Train Icon with DivIcon Pulse Ring
const createCustomTrainIcon = (speedKmh) => {
  return L.divIcon({
    className: 'custom-train-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="train-pulse-ring"></div>
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-zinc-900 via-neutral-800 to-black shadow-md flex items-center justify-center text-white border-2 border-white transform transition-transform hover:scale-105">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect width="16" height="16" x="4" y="3" rx="2"/>
            <path d="M4 11h16"/>
            <path d="M12 3v8"/>
            <path d="m8 19-2 3"/>
            <path d="m18 22-2-3"/>
            <circle cx="8" cy="15" r="1"/>
            <circle cx="16" cy="15" r="1"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

// Station Marker Icon
const stationIcon = L.divIcon({
  className: 'custom-station-marker',
  html: `
    <div class="w-7 h-7 rounded-full bg-white shadow-sm border-2 border-zinc-900 flex items-center justify-center text-zinc-900 font-bold text-[10px]">
      🚉
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

const STATIONS = [
  { code: "HWH", name: "Howrah Junction", lat: 22.5839, lng: 88.3426, km: 0.0 },
  { code: "BWN", name: "Barddhaman Junction", lat: 23.2494, lng: 87.8698, km: 95.0 },
  { code: "DGR", name: "Durgapur", lat: 23.5477, lng: 87.2917, km: 158.0 },
  { code: "ASN", name: "Asansol Junction", lat: 23.6835, lng: 86.9825, km: 200.0 }
];

export default function PassengerMap({ currentLat, currentLng, speedKmh, delayMin, nextStationName }) {
  const trainLat = currentLat || 22.5839;
  const trainLng = currentLng || 88.3426;

  const fullRouteCoords = STATIONS.map(s => [s.lat, s.lng]);
  const trainPos = [trainLat, trainLng];
  const completedCoords = [fullRouteCoords[0], trainPos];
  const remainingCoords = [trainPos, ...fullRouteCoords.slice(1)];

  return (
    <div className="w-full h-[320px] md:h-[400px] rounded-3xl overflow-hidden shadow-clay-card border border-[#e8e4da] relative bg-[#f9f8f3]">
      <MapContainer
        center={[23.15, 87.65]}
        zoom={9}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Station Markers */}
        {STATIONS.map((st) => (
          <Marker key={st.code} position={[st.lat, st.lng]} icon={stationIcon}>
            <Popup>
              <div className="p-1.5 font-sans text-xs">
                <span className="font-extrabold text-[#18181b] block text-sm">{st.name} ({st.code})</span>
                <span className="text-zinc-600 font-medium">Howrah - Asansol Line ({st.km} km)</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Train Marker with Live Pulse Animation */}
        <Marker position={[trainLat, trainLng]} icon={createCustomTrainIcon(speedKmh)}>
          <Popup>
            <div className="p-2 text-xs font-sans space-y-1">
              <span className="font-bold text-[#18181b] block text-sm">Train #12301 Rajdhani Exp</span>
              <span className="text-emerald-700 font-bold block">⚡ Speed: {speedKmh} km/h</span>
              <span className="text-amber-700 font-bold block">⏱️ Delay: +{delayMin} min</span>
              <span className="text-zinc-800 font-semibold block">📍 Heading to: {nextStationName || 'Barddhaman'}</span>
            </div>
          </Popup>
        </Marker>

        {/* Dynamic Route Line */}
        <Polyline positions={completedCoords} color="#10b981" weight={6} opacity={0.9} />
        <Polyline positions={remainingCoords} color="#18181b" weight={5} dashArray="10, 10" opacity={0.8} />
      </MapContainer>

      {/* Floating Clay Visual Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-md border border-[#e8e4da] rounded-2xl px-4 py-3 text-xs font-bold shadow-sm text-[#18181b] space-y-1.5">
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-2 bg-emerald-500 rounded-full shadow-sm" />
          <span>Covered Route</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-2 bg-zinc-900 rounded-full border-b border-dashed shadow-sm" />
          <span>Upcoming Track</span>
        </div>
      </div>
    </div>
  );
}

