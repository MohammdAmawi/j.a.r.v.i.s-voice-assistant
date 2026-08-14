import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Mic, Activity, ShieldCheck } from 'lucide-react';
import { soundFx } from '../audio/soundFx';

interface HeaderHUDProps {
  isListening: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onToggleVoice: () => void;
  statusText?: string;
}

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  isListening,
  soundEnabled,
  onToggleSound,
  onToggleVoice,
  statusText = 'SYSTEM ONLINE',
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      // Time format: 10:30:45 AM
      const time = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      // Date format: FRIDAY | MAY 24
      const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      const month = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
      
      setTimeStr(time);
      setDateStr(`${day} | ${month}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full relative z-20 select-none">
      {/* Top HUD Frame */}
      <div className="w-full max-w-7xl mx-auto px-4 pt-3 pb-2 flex flex-col md:flex-row items-center justify-between gap-3 text-slate-200">
        
        {/* Left: Branding & Status Marks */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-orbitron font-bold text-xl tracking-[0.35em] text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]">
              J . A . R . V . I . S
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-[11px] font-mono-cyber text-cyan-300">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>v4.2 PRO</span>
          </div>

          {/* Mini progress dots */}
          <div className="hidden md:flex items-center gap-1">
            <div className="w-3 h-1 bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></div>
            <div className="w-1 h-1 bg-cyan-600"></div>
            <div className="w-1 h-1 bg-cyan-800"></div>
          </div>
        </div>

        {/* Center: System Status Pill */}
        <div className="relative group">
          <div className="relative px-6 py-1.5 rounded-sm bg-cyan-950/40 border border-cyan-500/40 backdrop-blur-md flex items-center gap-3 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400"></div>

            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]"></div>
            <span className="font-orbitron text-xs tracking-[0.25em] text-cyan-300 font-semibold">
              • {statusText} •
            </span>
          </div>
        </div>

        {/* Right: Date, Time & Sound Controls */}
        <div className="flex items-center gap-5">
          <div className="text-right font-mono-cyber">
            <div className="text-[10px] tracking-widest text-cyan-500/80 uppercase font-semibold">
              {dateStr || 'SYSTEM ACTIVE'}
            </div>
            <div className="font-orbitron text-base font-bold text-cyan-200 tracking-wider">
              {timeStr || '00:00:00 AM'}
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-cyan-900/60 pl-4">
            <button
              id="hud-sound-toggle"
              onClick={() => {
                onToggleSound();
                soundFx.playHudClick();
              }}
              title={soundEnabled ? 'Disable HUD Sounds' : 'Enable HUD Sounds'}
              className={`p-2 rounded border transition-all ${
                soundEnabled
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                  : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              id="hud-voice-toggle"
              onClick={() => {
                onToggleVoice();
                soundFx.playWakeChime();
              }}
              title={isListening ? 'Stop Voice Listening' : 'Start Continuous Voice Recognition'}
              className={`p-2 rounded border transition-all flex items-center gap-1.5 ${
                isListening
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.5)] animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-cyan-400'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span className="text-[11px] font-mono-cyber font-medium hidden sm:inline">
                {isListening ? 'REC' : 'VOICE'}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* Futuristic Laser Divider Line (Green / Cyan Gradient) */}
      <div className="w-full relative h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.8)] opacity-90">
        <div className="absolute top-[-2px] left-1/2 -translate-x-1/2 w-48 h-[6px] bg-cyan-300 blur-[2px] opacity-80" />
      </div>
    </header>
  );
};
