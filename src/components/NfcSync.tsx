import { useState } from 'react';
import { Share2, Smartphone, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function NfcSync() {
  const [status, setStatus] = useState<'idle' | 'reading' | 'writing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleShare = async () => {
    if (!('NDEFReader' in window)) {
      setStatus('error');
      setMessage('Вашият браузър не поддържа NFC синхронизация.');
      return;
    }

    try {
      setStatus('writing');
      const reader = new (window as any).NDEFReader();
      const results = localStorage.getItem('performance_results') || '[]';
      
      await reader.write({
        records: [{ recordType: "text", data: `AUTOSTATS:${results}` }]
      });
      
      setStatus('success');
      setMessage('Данните са изпратени! Допрете до другия телефон.');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage('Грешка при NFC запис. Опитайте отново.');
    }
  };

  const handleReceive = async () => {
    if (!('NDEFReader' in window)) {
        setStatus('error');
        setMessage('Вашият браузър не поддържа NFC.');
        return;
      }

    try {
      setStatus('reading');
      const reader = new (window as any).NDEFReader();
      await reader.scan();
      setMessage('Допрете телефоните един до друг...');

      reader.onreading = (event: any) => {
        const decoder = new TextDecoder();
        for (const record of event.message.records) {
          const text = decoder.decode(record.data);
          if (text.startsWith('AUTOSTATS:')) {
            const data = text.replace('AUTOSTATS:', '');
            const existing = JSON.parse(localStorage.getItem('performance_results') || '[]');
            const incoming = JSON.parse(data);
            
            // Basic merge by ID
            const merged = [...existing];
            incoming.forEach((item: any) => {
              if (!merged.find(m => m.id === item.id)) merged.push(item);
            });

            localStorage.setItem('performance_results', JSON.stringify(merged));
            setStatus('success');
            setMessage('Синхронизирано успешно!');
            setTimeout(() => setStatus('idle'), 3000);
          }
        }
      };
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage('Грешка при четене.');
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Share2 className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-tight">NFC СИНХРОНИЗАЦИЯ</h3>
          <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">СПОДЕЛЕТЕ ДАННИ С ПРИЯТЕЛ</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button 
           onClick={handleShare}
           disabled={status !== 'idle' && status !== 'error'}
           className={cn(
             "py-4 rounded-2xl flex flex-col items-center justify-center gap-2 font-bold text-xs uppercase italic transition-all",
             "bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95",
             status === 'writing' && "animate-pulse border-blue-500 bg-blue-500/10"
           )}
        >
          <Smartphone className={cn("w-6 h-6", status === 'writing' && "text-blue-500")} />
          ИЗПРАТИ
        </button>
        <button 
           onClick={handleReceive}
           disabled={status !== 'idle' && status !== 'error'}
           className={cn(
            "py-4 rounded-2xl flex flex-col items-center justify-center gap-2 font-bold text-xs uppercase italic transition-all",
            "bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95",
            status === 'reading' && "animate-pulse border-orange-500 bg-orange-500/10"
          )}
        >
          <Smartphone className={cn("w-6 h-6", status === 'reading' && "text-orange-500")} />
          ПОЛУЧИ
        </button>
      </div>

      {status !== 'idle' && (
        <div className={cn(
          "p-4 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase italic",
          status === 'error' ? "bg-red-500/20 text-red-500 border border-red-500/30" : 
          status === 'success' ? "bg-green-500/20 text-green-500 border border-green-500/30" : 
          "bg-white/5 text-white/60 border border-white/10"
        )}>
          {status === 'reading' || status === 'writing' ? <Loader2 className="w-4 h-4 animate-spin" /> : 
           status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message}
        </div>
      )}
    </div>
  );
}
