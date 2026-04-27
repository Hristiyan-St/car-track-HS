import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../lib/utils';
import { MapPin, Navigation, Flag, RotateCcw, Search, LocateFixed, MousePointer2 } from 'lucide-react';

// Fix for default markers in Leaflet
const icon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  location: { latitude: number; longitude: number; speed: number | null; accuracy: number } | null;
  session: { points: { lat: number; lng: number }[] } | null;
  trackStart: [number, number] | null;
  trackEnd: [number, number] | null;
  onSetTrackA: (coords: [number, number] | null) => void;
  onSetTrackB: (coords: [number, number] | null) => void;
}

function MapEvents({ onMapClick, enabled }: { onMapClick: (lat: number, lng: number) => void, enabled: boolean }) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function MapView({ location, session, trackStart, trackEnd, onSetTrackA, onSetTrackB }: MapViewProps) {
  const [isDefiningTrack, setIsDefiningTrack] = useState<'A' | 'B' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const currentPos: [number, number] = location ? [location.latitude, location.longitude] : [42.6977, 23.3219]; 

  const sessionPath = session?.points.map(p => [p.lat, p.lng] as [number, number]) || [];

  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery || !isDefiningTrack) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const coords: [number, number] = [parseFloat(lat), parseFloat(lon)];
        if (isDefiningTrack === 'A') onSetTrackA(coords);
        else onSetTrackB(coords);
        setIsDefiningTrack(null);
        setSearchQuery('');
      } else {
        alert('Адресът не е намерен.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (isDefiningTrack === 'A') onSetTrackA([lat, lng]);
    else onSetTrackB([lat, lng]);
    setIsDefiningTrack(null);
  };

  return (
    <div className="relative h-full w-full bg-[#0A0A0B]">
      <MapContainer 
        center={currentPos} 
        zoom={16} 
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapEvents onMapClick={handleMapClick} enabled={!!isDefiningTrack} />
        
        {location && (
          <>
            <Marker position={currentPos} />
            <Circle 
              center={currentPos} 
              radius={location.accuracy} 
              pathOptions={{ fillColor: '#f97316', fillOpacity: 0.1, color: '#f97316', weight: 1 }} 
            />
            <ChangeView center={currentPos} />
          </>
        )}

        {sessionPath.length > 1 && (
          <Polyline 
            positions={sessionPath} 
            pathOptions={{ color: '#dc2626', weight: 4, lineJoin: 'round', opacity: 0.8 }} 
          />
        )}

        {trackStart && <Marker position={trackStart} icon={L.divIcon({ className: '', html: '<div class="w-8 h-8 bg-black rounded-full border-2 border-red-600 shadow-xl flex items-center justify-center font-mono font-bold text-white text-[10px]">A</div>' })} />}
        {trackEnd && <Marker position={trackEnd} icon={L.divIcon({ className: '', html: '<div class="w-8 h-8 bg-red-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center font-mono font-bold text-white text-[10px]">B</div>' })} />}
      </MapContainer>

      {/* Floating UI for Track Definition */}
      <div className="absolute top-6 left-6 right-6 z-[1000] flex flex-col gap-3">
         <div className="bg-[#111112]/95 backdrop-blur-xl border border-white/10 rounded-lg p-5 flex items-center justify-between shadow-2xl">
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDefiningTrack('A')}
                className={cn(
                  "px-5 py-2.5 rounded text-[9px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2",
                  isDefiningTrack === 'A' ? "bg-red-600 text-white border-red-500" : "bg-white/5 text-zinc-400 border-white/5"
                )}
              >
                <MapPin className="w-3 h-3" /> SET POINT A
              </button>
              <button 
                onClick={() => setIsDefiningTrack('B')}
                className={cn(
                  "px-5 py-2.5 rounded text-[9px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2",
                  isDefiningTrack === 'B' ? "bg-red-600 text-white border-red-500" : "bg-white/5 text-zinc-400 border-white/5"
                )}
              >
                <Flag className="w-3 h-3" /> SET POINT B
              </button>
            </div>
            
            <button 
              onClick={() => { onSetTrackA(null); onSetTrackB(null); }}
              className="p-2.5 bg-white/5 text-zinc-500 border border-white/5 rounded hover:bg-red-600/10 hover:text-red-500 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
         </div>

         {isDefiningTrack && (
           <div className="bg-[#111112]/98 border border-red-600/50 text-white p-6 rounded-lg shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-500 mb-2">
                <MousePointer2 className="w-3 h-3" /> SELECT POINT {isDefiningTrack}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Method 1: Current GPS */}
                <button 
                  onClick={() => {
                    if (location) {
                      if (isDefiningTrack === 'A') onSetTrackA([location.latitude, location.longitude]);
                      else onSetTrackB([location.latitude, location.longitude]);
                      setIsDefiningTrack(null);
                    }
                  }}
                  className="bg-white text-black p-4 rounded flex flex-col items-center gap-2 group hover:bg-red-600 hover:text-white transition-all"
                >
                  <LocateFixed className="w-6 h-6" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">USE CURRENT GPS</span>
                </button>

                {/* Method 2: Click Info */}
                <div className="bg-white/5 border border-white/10 p-4 rounded flex flex-col items-center justify-center gap-2 text-zinc-500 pointer-events-none">
                  <MousePointer2 className="w-6 h-6" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">OR TAP MAP DIRECTLY</span>
                </div>
              </div>

              {/* Method 3: Address Search */}
              <form onSubmit={handleAddressSearch} className="relative mt-4">
                <input 
                  type="text"
                  placeholder="Въведете адрес (напр. София, Витошка)..."
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded p-4 pl-12 text-xs font-mono text-zinc-300 focus:border-red-600 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <button 
                  type="submit"
                  disabled={isSearching}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 text-white px-4 py-1.5 rounded text-[10px] font-bold uppercase"
                >
                  {isSearching ? '...' : 'SEARCH'}
                </button>
              </form>

              <button 
                onClick={() => setIsDefiningTrack(null)}
                className="w-full py-2 text-[9px] font-bold text-zinc-600 uppercase hover:text-white transition-colors"
              >
                CANCEL
              </button>
           </div>
         )}
      </div>

      <div className="absolute bottom-6 right-6 z-[1000]">
        <button className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(220,38,38,0.3)] active:scale-90 transition-transform">
          <Navigation className="w-6 h-6 fill-current" />
        </button>
      </div>

      <style>{`
        .leaflet-container {
          background: #0A0A0B !important;
        }
        .leaflet-tile {
          filter: invert(100%) hue-rotate(180deg) brightness(80%) contrast(110%) grayscale(1);
        }
      `}</style>
</div>
  );
}
