import React from 'react';
import { AssistantState } from '../types';
import { soundFx } from '../audio/soundFx';

interface ArcReactorProps {
  state: AssistantState;
  onClick?: () => void;
}

export const ArcReactor: React.FC<ArcReactorProps> = ({ state, onClick }) => {
  // Color configuration depending on current AI state
  const getStateColors = () => {
    switch (state) {
      case 'listening':
        return {
          glow: 'rgba(34, 211, 238, 0.9)',
          border: 'border-cyan-400',
          bg: 'bg-cyan-500/20',
          core: 'from-cyan-200 via-cyan-400 to-blue-600',
          pulseSpeed: 'animate-pulse',
        };
      case 'processing':
        return {
          glow: 'rgba(245, 158, 11, 0.9)',
          border: 'border-amber-400',
          bg: 'bg-amber-500/20',
          core: 'from-amber-100 via-amber-400 to-orange-600',
          pulseSpeed: 'animate-spin-slow',
        };
      case 'speaking':
        return {
          glow: 'rgba(56, 189, 248, 1)',
          border: 'border-sky-400',
          bg: 'bg-sky-500/25',
          core: 'from-sky-100 via-cyan-300 to-indigo-600',
          pulseSpeed: 'animate-bounce',
        };
      case 'executing':
        return {
          glow: 'rgba(74, 222, 128, 0.9)',
          border: 'border-emerald-400',
          bg: 'bg-emerald-500/20',
          core: 'from-emerald-100 via-emerald-400 to-teal-700',
          pulseSpeed: 'animate-pulse',
        };
      case 'error':
        return {
          glow: 'rgba(248, 113, 113, 0.9)',
          border: 'border-rose-500',
          bg: 'bg-rose-500/20',
          core: 'from-rose-200 via-red-500 to-rose-900',
          pulseSpeed: 'animate-ping',
        };
      case 'idle':
      default:
        return {
          glow: 'rgba(34, 211, 238, 0.6)',
          border: 'border-cyan-500/50',
          bg: 'bg-cyan-950/30',
          core: 'from-cyan-200 via-cyan-400 to-cyan-700',
          pulseSpeed: '',
        };
    }
  };

  const colors = getStateColors();

  const handleClick = () => {
    soundFx.playPowerPulse();
    if (onClick) onClick();
  };

  return (
    <div 
      id="jarvis-arc-reactor-wrapper"
      onClick={handleClick}
      className="relative flex items-center justify-center cursor-pointer group select-none py-6 my-2"
      title="J.A.R.V.I.S Arc Reactor Neural Core — Click to Pulse"
    >
      {/* Outer Glow Halo */}
      <div 
        className="absolute w-72 h-72 rounded-full blur-2xl opacity-40 transition-all duration-700 pointer-events-none"
        style={{ backgroundColor: colors.glow }}
      />

      {/* SVG Multi-Layered Sci-Fi HUD Concentric Rings */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
        
        {/* Layer 1: Outermost Dashed Technical Ring (Rotates Clockwise) */}
        <div className="absolute inset-0 border border-cyan-500/20 rounded-full animate-spin-slow">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="0.4"
              strokeDasharray="2, 6, 8, 4"
              opacity="0.6"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="0.3"
              strokeDasharray="1, 8"
              opacity="0.4"
            />
          </svg>
        </div>

        {/* Layer 2: Intermediate Geometrical Segmented Ring (Rotates Counter-Clockwise) */}
        <div className="absolute inset-4 border border-cyan-400/30 rounded-full animate-spin-reverse">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="0.75"
              strokeDasharray="15, 30"
              opacity="0.7"
            />
            {/* Cardinal Angle Ticks */}
            <line x1="50" y1="2" x2="50" y2="7" stroke="#22d3ee" strokeWidth="1" />
            <line x1="50" y1="93" x2="50" y2="98" stroke="#22d3ee" strokeWidth="1" />
            <line x1="2" y1="50" x2="7" y2="50" stroke="#22d3ee" strokeWidth="1" />
            <line x1="93" y1="50" x2="98" y2="50" stroke="#22d3ee" strokeWidth="1" />
          </svg>
        </div>

        {/* Layer 3: Inner Orbital Track with Sensor Nodes */}
        <div className="absolute inset-8 rounded-full border border-cyan-400/40 animate-spin-slow">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee]"></div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></div>
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></div>
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee]"></div>
        </div>

        {/* Layer 4: Beveled Arc Reactor Core Chassis */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-cyan-500/60 bg-[#060e1a] shadow-[inset_0_0_25px_rgba(6,182,212,0.6)] flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
          
          {/* Internal Radiating Segments */}
          <div className="absolute inset-1 rounded-full border border-cyan-400/40">
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-full h-[1px] bg-cyan-400/40 absolute rotate-0"></div>
              <div className="w-full h-[1px] bg-cyan-400/40 absolute rotate-45"></div>
              <div className="w-full h-[1px] bg-cyan-400/40 absolute rotate-90"></div>
              <div className="w-full h-[1px] bg-cyan-400/40 absolute rotate-135"></div>
            </div>
          </div>

          {/* Inner Glowing Lens */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-cyan-300/80 bg-cyan-950/80 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.8),inset_0_0_15px_#22d3ee]">
            
            {/* Core Fusion Flame / Singularity */}
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr ${colors.core} shadow-[0_0_25px_#ffffff,0_0_45px_#22d3ee] animate-pulse`} />

            {/* Micro Tech Grid Over Core */}
            <div className="absolute inset-2 border border-white/40 rounded-full opacity-60"></div>
            <div className="absolute w-4 h-4 rounded-full bg-white blur-[1px]"></div>
          </div>

        </div>

      </div>

      {/* State Badge Tooltip Indicator below core */}
      <div className="absolute bottom-0 text-center">
        <span className="font-mono-cyber text-[10px] tracking-[0.25em] text-cyan-400/90 uppercase font-semibold bg-cyan-950/60 px-3 py-0.5 rounded border border-cyan-500/30">
          CORE: {state.toUpperCase()}
        </span>
      </div>

    </div>
  );
};
