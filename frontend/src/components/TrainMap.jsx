import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Animated Custom Train DivIcon
const createCustomTrainIcon = () => {
  return L.divIcon({
    className: 'custom-train-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="train-pulse-ring"></div>
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-zinc-900 via-neutral-800 to-black shadow-lg flex items-center justify-center text-white border-2 border-zinc-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

const stationIcon = L.divIcon({
  className: 'custom-station-marker',
  html: `
    <div class="w-6 h-6 rounded-full bg-[#18181b] shadow-md border-2 border-zinc-400 flex items-center justify-center text-zinc-200 font-bold text-[9px]">
      🚉
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

const STATIONS = [
  { code: "HWH", name: "Howrah Junction", lat: 22.5839, lng: 88.3426, km: 0.0 },
  { code: "BWN", name: "Barddhaman Junction", lat: 23.2494, lng: 87.8698, km: 95.0 },
  { code: "DGR", name: "Durgapur", lat: 23.5477, lng: 87.2917, km: 158.0 },
  { code: "ASN", name: "Asansol Junction", lat: 23.6835, lng: 86.9825, km: 200.0 }
];

export default function TrainMap({ currentLat, currentLng, speedKmh, delayMin, status }) {
  const trainLat = currentLat || 22.5839;
  const trainLng = currentLng || 88.3426;

  // Station coordinate array
  const fullRouteCoords = STATIONS.map(s => [s.lat, s.lng]);

  // Splitting path: Completed vs Remaining
  const trainPos = [trainLat, trainLng];
  const completedCoords = [fullRouteCoords[0], trainPos];
  const remainingCoords = [trainPos, ...fullRouteCoords.slice(1)];

  return (
    <div className="w-full h-80 clay-card-dark rounded-2xl overflow-hidden relative border border-neutral-800 shadow-2xl">
      <MapContainer
        center={[23.1, 87.6]}
        zoom={9}
        scrollWheelZoom={false}
        className="w-full h-full bg-[#18181b]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Station Markers */}
        {STATIONS.map((st) => (
          <Marker key={st.code} position={[st.lat, st.lng]} icon={stationIcon}>
            <Popup>
              <div className="p-1 font-sans text-xs">
                <span className="font-bold text-zinc-200 block">{st.code} - {st.name}</span>
                <span className="text-zinc-400">Corridor Distance: {st.km} km</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Train Marker */}
        <Marker position={[trainLat, trainLng]} icon={createCustomTrainIcon()}>
          <Popup>
            <div className="p-1.5 text-xs font-sans space-y-0.5">
              <span className="font-bold text-zinc-200 block">Train #12301 Rajdhani Exp</span>
              <span className="text-emerald-400 font-semibold block">Speed: {speedKmh} km/h</span>
              <span className="text-amber-400 font-semibold block">Delay: +{delayMin} min</span>
              <span className="text-zinc-300 font-bold font-mono block">Status: {status || 'IN_TRANSIT'}</span>
            </div>
          </Popup>
        </Marker>

        {/* Route Polylines */}
        <Polyline positions={completedCoords} color="#10b981" weight={5} opacity={0.9} />
        <Polyline positions={remainingCoords} color="#a1a1aa" weight={4} dashArray="8, 8" opacity={0.85} />
      </MapContainer>

      {/* Floating Dark Map Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-[#18181b]/95 backdrop-blur-md border border-neutral-800 rounded-xl p-3 text-[11px] font-mono space-y-1 shadow-lg text-zinc-200">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-1.5 bg-emerald-500 rounded-full" />
          <span>Covered Track</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-1.5 bg-zinc-400 rounded-full border-b border-dashed" />
          <span>Remaining Corridor</span>
        </div>
      </div>
    </div>
  );
}

