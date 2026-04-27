import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Zap, Trophy, Timer, History as HistoryIcon, Flag } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface PerformanceTrackerProps {
  speed: number;
}

interface TestResult {
  id: string;
  type: '0-100' | '100-200' | 'Quarter Mile';
  time: number;
  timestamp: number;
}

export default function PerformanceTracker({ speed }: PerformanceTrackerProps) {
  const [results, setResults] = useState<TestResult[]>(() => {
    const saved = localStorage.getItem('performance_results');
    return saved ? JSON.parse(saved) : [];
  });

  // 0-100 Logic
  const [isTracking0100, setIsTracking0100] = useState(false);
  const [startTime0100, setStartTime0100] = useState<number | null>(null);
  const [currentTime0100, setCurrentTime0100] = useState(0);

  // 100-200 Logic
  const [isTracking100200, setIsTracking100200] = useState(false);
  const [startTime100200, setStartTime100200] = useState<number | null>(null);
  const [currentTime100200, setCurrentTime100200] = useState(0);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // 0-100 Trigger
    if (speed === 0 && !isTracking0100) {
      // Ready to start
      setIsTracking0100(false);
      setStartTime0100(null);
    } else if (speed > 0 && speed < 100 && !isTracking0100 && !startTime0100) {
      // Start!
      setIsTracking0100(true);
      setStartTime0100(Date.now());
    } else if (speed >= 100 && isTracking0100 && startTime0100) {
      // Finish!
      const finishTime = (Date.now() - startTime0100) / 1000;
      saveResult('0-100', finishTime);
      setIsTracking0100(false);
      setStartTime0100(null);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f97316', '#ffffff', '#000000']
      });
    }

    // 100-200 Trigger
    if (speed >= 100 && speed < 110 && !isTracking100200) {
       // Start 100-200
       setIsTracking100200(true);
       setStartTime100200(Date.now());
    } else if (speed >= 200 && isTracking100200 && startTime100200) {
       // Finish 100-200
       const finishTime = (Date.now() - startTime100200) / 1000;
       saveResult('100-200', finishTime);
       setIsTracking100200(false);
       setStartTime100200(null);
       confetti();
    } else if (speed < 90 && isTracking100200) {
       // Reset if speed drops too low
       setIsTracking100200(false);
       setStartTime100200(null);
    }
  }, [speed]);

  // Update timers
  useEffect(() => {
    if (isTracking0100 || isTracking100200) {
      timerRef.current = window.setInterval(() => {
        if (startTime0100) setCurrentTime0100((Date.now() - startTime0100) / 1000);
        if (startTime100200) setCurrentTime100200((Date.now() - startTime100200) / 1000);
      }, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTracking0100, isTracking100200, startTime0100, startTime100200]);

  const saveResult = (type: TestResult['type'], time: number) => {
    const newResult: TestResult = {
      id: crypto.randomUUID(),
      type,
      time,
      timestamp: Date.now()
    };
    const newResults = [newResult, ...results];
    setResults(newResults);
    localStorage.setItem('performance_results', JSON.stringify(newResults));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 space-y-8"
    >
      <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 border-b border-white/10 pb-4">PERFORMANCE INSTRUMENTS</h2>
      
      {/* Active Tests */}
      <div className="grid gap-6">
        <div className={cn(
          "bg-[#111112] border transition-all duration-500 rounded-lg p-8",
          isTracking0100 ? "border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.1)]" : "border-white/5"
        )}>
           <div className="flex justify-between items-start mb-6">
             <div>
               <h3 className="text-zinc-500 text-[9px] uppercase font-bold tracking-[0.2em] mb-1">ACCELERATION</h3>
               <div className="text-2xl font-mono font-light tracking-tight text-white">0 — 100 KM/H</div>
             </div>
             <Timer className={cn("w-5 h-5", isTracking0100 ? "text-red-600 status-pulse" : "text-zinc-700")} />
           </div>
           <div className="text-7xl font-mono font-light tracking-tighter text-right text-zinc-100">
              {currentTime0100.toFixed(2)}<span className="text-lg ml-2 text-zinc-600 uppercase">s</span>
           </div>
           <div className="mt-6 pt-4 border-t border-white/[0.03] text-[9px] text-zinc-600 font-bold uppercase tracking-widest flex items-center gap-2">
              <Zap className={cn("w-3 h-3", isTracking0100 && "text-red-600")} /> 
              {speed === 0 ? "READY: FULL STOP DETECTED" : isTracking0100 ? "TRACKING ACTIVE" : "WAITING FOR 0 KM/H START"}
           </div>
        </div>

        <div className={cn(
          "bg-[#111112] border transition-all duration-500 rounded-lg p-8",
          isTracking100200 ? "border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.1)]" : "border-white/5"
        )}>
           <div className="flex justify-between items-start mb-6">
             <div>
               <h3 className="text-zinc-500 text-[9px] uppercase font-bold tracking-[0.2em] mb-1">ELASTICITY</h3>
               <div className="text-2xl font-mono font-light tracking-tight text-white">100 — 200 KM/H</div>
             </div>
             <Flag className={cn("w-5 h-5", isTracking100200 ? "text-red-600 status-pulse" : "text-zinc-700")} />
           </div>
           <div className="text-7xl font-mono font-light tracking-tighter text-right text-zinc-100">
              {currentTime100200.toFixed(2)}<span className="text-lg ml-2 text-zinc-600 uppercase">s</span>
           </div>
        </div>
      </div>

      {/* Results History */}
      <div className="pt-4 space-y-6">
        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] flex items-center gap-2">
          <Trophy className="w-3 h-3 text-red-600" /> SYSTEM RECORDS
        </h3>
        
        {results.length === 0 ? (
          <div className="bg-[#111112] border border-white/5 rounded-lg p-12 text-center text-zinc-700 text-[10px] uppercase font-bold tracking-widest">
            No telemetry data recorded
          </div>
        ) : (
          <div className="space-y-3">
            {results.map(r => (
              <div key={r.id} className="bg-[#111112] border border-white/5 rounded-lg p-5 flex items-center justify-between hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-red-600/5 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-red-600 opacity-60" />
                  </div>
                  <div>
                    <div className="font-mono text-sm text-zinc-200 tracking-tight">{r.type}</div>
                    <div className="text-[9px] text-zinc-600 uppercase font-bold mt-0.5">{format(r.timestamp, 'MMM dd HH:mm')}</div>
                  </div>
                </div>
                <div className="text-2xl font-mono font-light text-red-600">
                  {r.time.toFixed(2)}s
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
