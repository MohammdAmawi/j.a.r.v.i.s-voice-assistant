import React from 'react';
import { ShieldCheck, Cpu, HardDrive, Zap, Radio, Sparkles } from 'lucide-react';
import { AssistantState } from '../types';

interface SystemStatusPanelProps {
  state: AssistantState;
  isListening: boolean;
  powerCore?: number;
  onRunDiagnostic?: () => void;
  onQuickAction?: (actionText: string) => void;
}

export const SystemStatusPanel: React.FC<SystemStatusPanelProps> = ({
  state,
  isListening,
  powerCore = 100,
  onRunDiagnostic,
  onQuickAction,
}) => {
  return (
    <div className="w-full max-w-xs hud-panel hud-bracket rounded p-4 text-slate-200 border border-cyan-500/40 relative select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <h3 className="font-orbitron text-xs font-bold tracking-[0.2em] text-cyan-300">
            SYSTEM STATUS
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/30"></span>
        </div>
      </div>

      {/* Metrics Rows */}
      <div className="space-y-2.5 font-mono-cyber text-xs">
        {/* Power Core */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 tracking-wider text-[11px]">POWER CORE</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-cyan-950 rounded-full overflow-hidden border border-cyan-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_6px_#22d3ee]"
                style={{ width: `${powerCore}%` }}
              />
            </div>
            <span className="font-bold text-cyan-300">{powerCore}%</span>
          </div>
        </div>

        {/* Systems Status */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 tracking-wider text-[11px]">SYSTEMS</span>
          <span className="font-semibold text-emerald-400 tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            ONLINE
          </span>
        </div>

        {/* Network */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 tracking-wider text-[11px]">NETWORK</span>
          <span className="font-semibold text-cyan-300 tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            SECURE (WSS)
          </span>
        </div>

        {/* Voice Module */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 tracking-wider text-[11px]">VOICE MODULE</span>
          <span
            className={`font-semibold tracking-wider flex items-center gap-1 ${
              isListening ? 'text-cyan-300' : 'text-amber-400'
            }`}
          >
            <Radio className={`w-3 h-3 ${isListening ? 'animate-spin' : ''}`} />
            {isListening ? 'ACTIVE' : 'STANDBY'}
          </span>
        </div>

        {/* AI Brain Engine */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 tracking-wider text-[11px]">AI CORE</span>
          <span className="font-semibold text-cyan-400 tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-300" />
            GEMINI 3.7 FLASH
          </span>
        </div>
      </div>

      {/* Quick Voice Triggers */}
      <div className="mt-4 pt-3 border-t border-cyan-900/60">
        <div className="text-[10px] tracking-widest text-cyan-500 uppercase font-semibold mb-2">
          VOICE DIRECTIVES
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono-cyber">
          {[
            'Open VS Code',
            'Take Screenshot',
            'Draft PDF Briefing',
            'Play Synthwave',
          ].map((cmd) => (
            <button
              key={cmd}
              onClick={() => onQuickAction && onQuickAction(cmd)}
              className="px-2 py-1 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/40 hover:border-cyan-400/60 rounded text-cyan-300 hover:text-cyan-100 transition-all text-left truncate"
            >
              › {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
