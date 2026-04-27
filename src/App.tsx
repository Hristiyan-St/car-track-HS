/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Navigation, 
  Settings, 
  History, 
  Play, 
  Square, 
  RotateCcw, 
  Zap, 
  Map as MapIcon, 
  Share2,
  Trophy,
  Activity,
  ChevronRight,
  TrendingUp,
  Clock,
  MapPin
} from 'lucide-react';
import { useGeolocation, type LocationData } from './hooks/useGeolocation';
import { cn, formatSpeed, formatDistance } from './lib/utils';
import MapView from './components/MapView';
import PerformanceTracker from './components/PerformanceTracker';
import NfcSync from './components/NfcSync';
import { format } from 'date-fns';

type Tab = 'dashboard' | 'map' | 'history' | 'performance' | 'settings';

interface Session {
  id: string;
  startTime: number;
  endTime?: number;
  distance: number;
  maxSpeed: number;
  avgSpeed: number;
  points: { lat: number; lng: number; timestamp: number }[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { location, error } = useGeolocation();
  
  // Tracking State
  const [isRecording, setIsRecording] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [history, setHistory] = useState<Session[]>(() => {
    const saved = localStorage.getItem('autostats_history');
    return saved ? JSON.parse(saved) : [];
  });

  const currentSpeedKmH = useMemo(() => formatSpeed(location?.speed ?? 0), [location]);

  // Performance State
  const [isLapActive, setIsLapActive] = useState(false);
  const [lapStartTime, setLapStartTime] = useState<number | null>(null);
  const [trackA, setTrackA] = useState<[number, number] | null>(null);
  const [trackB, setTrackB] = useState<[number, number] | null>(null);
  
  const gForce = useMemo(() => {
    if (!session || session.points.length < 2) return 0;
    const p2 = session.points[session.points.length - 1];
    const p1 = session.points[session.points.length - 2];
    const dt = (p2.timestamp - p1.timestamp) / 1000;
    if (dt <= 0) return 0;
    const dv = (formatSpeed(location?.speed ?? 0) - formatSpeed(session.points[session.points.length - 2].speed ?? 0)) / 3.6; // m/s
    return Number((dv / dt / 9.81).toFixed(2));
  }, [location, session]);

  // Update session data when coordinates change
  useEffect(() => {
    if (isRecording && location && session) {
      setSession(prev => {
        if (!prev) return null;
        
        const newPoints = [...prev.points, { lat: location.latitude, lng: location.longitude, timestamp: location.timestamp }];
        
        // Simple distance calculation
        let newDistance = prev.distance;
        if (prev.points.length > 0) {
          const lastPoint = prev.points[prev.points.length - 1];
          const d = calculateDistance(lastPoint.lat, lastPoint.lng, location.latitude, location.longitude);
          newDistance += d;
        }

        const newMaxSpeed = Math.max(prev.maxSpeed, currentSpeedKmH);
        
        return {
          ...prev,
          points: newPoints,
          distance: newDistance,
          maxSpeed: newMaxSpeed,
          avgSpeed: (prev.avgSpeed * (newPoints.length - 1) + currentSpeedKmH) / newPoints.length
        };
      });
    }
  }, [location, isRecording, currentSpeedKmH]);

  // Track Trigger Logic
  useEffect(() => {
    if (!location || !trackA) return;
    
    // Check Point A proximity (25m radius)
    const distA = calculateDistance(location.latitude, location.longitude, trackA[0], trackA[1]);
    if (!isLapActive && distA < 25 && currentSpeedKmH > 10) {
      setIsLapActive(true);
      setLapStartTime(Date.now());
    }

    // Check Point B proximity
    if (isLapActive && trackB) {
      const distB = calculateDistance(location.latitude, location.longitude, trackB[0], trackB[1]);
      if (distB < 25) {
        const lapTime = (Date.now() - (lapStartTime ?? 0)) / 1000;
        setIsLapActive(false);
        // Save track result
        const trackResult = {
          id: crypto.randomUUID(),
          type: 'Track A-B' as const,
          time: lapTime,
          timestamp: Date.now()
        };
        const results = JSON.parse(localStorage.getItem('performance_results') || '[]');
        localStorage.setItem('performance_results', JSON.stringify([trackResult, ...results]));
        alert(`ФИНИШ! ВРЕМЕ: ${lapTime.toFixed(2)}s`);
      }
    }
  }, [location, trackA, trackB, isLapActive]);

  const startSession = () => {
    const newSession: Session = {
      id: crypto.randomUUID(),
      startTime: Date.now(),
      distance: 0,
      maxSpeed: 0,
      avgSpeed: 0,
      points: location ? [{ lat: location.latitude, lng: location.longitude, timestamp: location.timestamp }] : []
    };
    setSession(newSession);
    setIsRecording(true);
  };

  const stopSession = () => {
    if (session) {
      const finalSession = { ...session, endTime: Date.now() };
      const newHistory = [finalSession, ...history];
      setHistory(newHistory);
      localStorage.setItem('autostats_history', JSON.stringify(newHistory));
    }
    setIsRecording(false);
    setSession(null);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  return (
    <div className="h-screen w-full bg-[#0A0A0B] text-white flex flex-col overflow-hidden font-sans select-none">
      {/* Header */}
      <header className="px-6 py-4 border-b border-white/10 bg-[#111112] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-600 status-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
          <h1 className="font-mono text-sm tracking-[0.2em] font-bold text-red-500 uppercase">Live Tracking</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase text-zinc-500 font-bold tracking-tighter">GPS Signal</span>
            <span className="text-xs font-mono text-zinc-300">
              {location ? `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}` : 'SCANNING...'}
            </span>
          </div>
          <div className="h-6 w-[1px] bg-white/10 hidden sm:block"></div>
          <div className="hidden sm:flex items-center gap-3 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-white/5">
            <span className="text-[9px] uppercase text-zinc-400 font-bold">AutoStats v1.4</span>
            <div className={cn(
              "w-2 h-2 rounded-full transition-colors",
              location ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-red-500"
            )} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative pb-24 bg-[#0D0D0E]/50">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-1 h-full flex flex-col"
            >
              <div className="flex-1 flex flex-col items-center justify-center relative py-12">
                {/* Visual Decor */}
                <div className="absolute w-[450px] h-[450px] border border-white/5 rounded-full" />
                <div className="absolute w-[550px] h-[550px] border border-dashed border-white/[0.02] rounded-full animate-spin-slow" />
                
                {/* G-Force Meter */}
                <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                   <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest vertical-text">G-FORCE</div>
                   <div className="h-40 w-1 bg-white/5 rounded-full relative overflow-hidden">
                      <motion.div 
                        animate={{ height: `${Math.min(Math.abs(gForce) * 50, 100)}%`, top: gForce >= 0 ? '50%' : 'auto', bottom: gForce < 0 ? '50%' : 'auto' }}
                        className={cn("absolute w-full left-0", gForce >= 0 ? "bg-red-600" : "bg-blue-600")}
                      />
                   </div>
                   <div className="text-xs font-mono font-bold text-zinc-400">{gForce}G</div>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                  {isLapActive && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-16 bg-red-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full bg-white status-pulse" />
                      LAP IN PROGRESS: {((Date.now() - (lapStartTime ?? 0)) / 1000).toFixed(1)}s
                    </motion.div>
                  )}
                  <span className="text-[10rem] md:text-[14rem] font-bold leading-none tracking-tighter text-white speed-text">
                    {currentSpeedKmH}
                  </span>
                  <span className="text-red-600 font-mono text-lg font-bold tracking-[0.5em] uppercase -mt-4 opacity-80">
                    KM/H
                  </span>
                </div>
              </div>

              {/* Stats Panel */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1 bg-white/5 p-1 px-4">
                <StatCard 
                  label="MAX SPEED" 
                  value={`${session?.maxSpeed ?? 0}`}
                  unit="KM/H"
                />
                <StatCard 
                  label="AVG SPEED" 
                  value={`${Math.round(session?.avgSpeed ?? 0)}`}
                  unit="KM/H"
                />
                <StatCard 
                  label="DISTANCE" 
                  value={formatDistance(session?.distance ?? 0).replace(/[a-z]/gi, '')}
                  unit={formatDistance(session?.distance ?? 0).replace(/[0-9.]/g, '').toUpperCase()}
                />
                <StatCard 
                  label="SESSION TIME" 
                  value={session ? format((Date.now() - session.startTime), 'mm:ss') : '00:00'}
                  unit="MIN"
                />
              </div>

              {/* Controls */}
              <div className="p-6">
                {!isRecording ? (
                  <button 
                    onClick={startSession}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-5 rounded-lg flex items-center justify-center gap-3 tracking-[0.2em] transition-all active:scale-[0.98] uppercase text-xs"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    BEGIN TRACKING
                  </button>
                ) : (
                  <button 
                    onClick={stopSession}
                    className="w-full bg-white text-black font-bold py-5 rounded-lg flex items-center justify-center gap-3 tracking-[0.2em] transition-all active:scale-[0.98] uppercase text-xs"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    STOP & SAVE SESSION
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'performance' && (
            <PerformanceTracker speed={currentSpeedKmH} />
          )}

          {activeTab === 'map' && (
            <motion.div 
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <MapView 
                location={location} 
                session={session} 
                trackStart={trackA}
                trackEnd={trackB}
                onSetTrackA={setTrackA}
                onSetTrackB={setTrackB}
              />
            </motion.div>
          )}

          {activeTab === 'history' && (
             <motion.div 
             key="history"
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             className="p-8 space-y-6"
           >
             <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-zinc-500 border-b border-white/10 pb-4">SESSION HISTORY</h2>
             {history.length === 0 ? (
               <div className="text-center py-20 text-zinc-600 space-y-4">
                 <RotateCcw className="w-12 h-12 mx-auto opacity-10" />
                 <p className="text-[10px] uppercase tracking-widest font-bold">No data recorded</p>
               </div>
             ) : (
               <div className="space-y-4">
                 {history.map((s) => (
                   <div key={s.id} className="bg-[#111112] border border-white/5 rounded-lg p-5 flex justify-between items-center group hover:border-red-600/30 transition-all">
                     <div className="space-y-1">
                       <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{format(s.startTime, 'MMM dd · HH:mm')}</div>
                       <div className="text-xl font-mono text-zinc-200">
                         {formatDistance(s.distance)} <span className="text-[10px] text-zinc-600">at</span> {s.maxSpeed} <span className="text-[10px] text-zinc-600">KM/H MAX</span>
                       </div>
                     </div>
                     <button className="w-10 h-10 rounded bg-white/5 flex items-center justify-center group-hover:bg-red-600 transition-colors">
                       <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                     </button>
                   </div>
                 ))}
               </div>
             )}
           </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="p-8 space-y-8"
            >
              <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-zinc-500 border-b border-white/10 pb-4">SYSTEM SETTINGS</h2>
              
              <NfcSync />

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] pl-1">PREFERENCES</h3>
                <div className="bg-[#111112] border border-white/10 rounded-lg overflow-hidden">
                  <SettingItem label="UNITS" value="KM/H" />
                  <SettingItem label="GPS ACCURACY" value={location ? `${location.accuracy.toFixed(1)}m` : '---'} />
                  <SettingItem label="SYNC MODE" value="NFC / LOCAL" />
                </div>
              </div>

              <div className="pt-8">
                <button 
                  onClick={() => {
                    if(confirm('SYSTEM RESET: Are you sure you want to delete all stored metrics?')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full bg-red-600/5 border border-red-600/20 py-4 text-red-500 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 rounded hover:bg-red-600/10 transition-all"
                >
                  <RotateCcw className="w-3 h-3" /> PURGE CACHED DATA
                </button>
              </div>

              <div className="text-center text-[9px] text-zinc-700 uppercase font-black tracking-[0.3em] py-8">
                AUTOSTATS PRECISION INSTRUMENT<br/>BUILD VER 1.4.0 · OFFLINE ENCRYPTED
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0B] border-t border-white/10 flex items-center justify-around h-20 px-8">
        <NavButton active={activeTab === 'dashboard'} icon={<Activity />} label="METRICS" onClick={() => setActiveTab('dashboard')} />
        <NavButton active={activeTab === 'performance'} icon={<Zap />} label="POWER" onClick={() => setActiveTab('performance')} />
        <NavButton active={activeTab === 'map'} icon={<MapIcon />} label="TRACK" onClick={() => setActiveTab('map')} />
        <NavButton active={activeTab === 'history'} icon={<History />} label="LOGS" onClick={() => setActiveTab('history')} />
        <NavButton active={activeTab === 'settings'} icon={<Settings />} label="SYSTEM" onClick={() => setActiveTab('settings')} />
      </nav>
      
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string, value: string, unit: string }) {
  return (
    <div className="bg-[#0D0D0E] p-6 flex flex-col gap-1 border-r border-white/5 last:border-0 grow">
      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-mono font-light text-zinc-100">{value}</span>
        <span className="text-xs font-mono text-zinc-600 font-bold uppercase">{unit}</span>
      </div>
    </div>
  );
}

function SettingItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between p-5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
      <span className="text-xs font-mono text-white font-bold">{value}</span>
    </div>
  );
}

function NavButton({ icon, active, label, onClick }: { icon: React.ReactElement, active: boolean, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 transition-all duration-300 relative px-4",
        active ? "text-red-600" : "text-zinc-600"
      )}
    >
      <div className={cn(
        "w-1 h-1 rounded-full mb-0.5 transition-all",
        active ? "bg-red-600 scale-125" : "bg-white opacity-20"
      )} />
      {React.cloneElement(icon, { className: "w-5 h-5 mb-0.5" })}
      <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
      
      {active && (
        <motion.div 
          layoutId="nav-glow"
          className="absolute -bottom-4 left-0 right-0 h-1 bg-red-600 blur-[4px] opacity-30"
        />
      )}
    </button>
  );
}

