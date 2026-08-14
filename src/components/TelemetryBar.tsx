import React from 'react';
import { Wifi, Cpu, HardDrive, Network, Terminal, Folder, Music, Brain, Globe, FileCode2, FlaskConical, MessageSquare } from 'lucide-react';
import { SystemTelemetry } from '../types';

export type ActiveTab = 'chat' | 'os' | 'files' | 'spotify' | 'memory' | 'search' | 'architecture' | 'tests';

interface TelemetryBarProps {
  telemetry: SystemTelemetry;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  telemetry,
  activeTab,
  onSelectTab,
}) => {
  return (
    <footer className="w-full relative z-20 select-none bg-[#020408]/95 border-t border-[#1e293b] backdrop-blur-md">
      <div className="w-full max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 text-slate-300 text-xs font-mono-cyber">
        
        {/* Left: Telemetry Metrics */}
        <div className="flex items-center gap-6">
          {/* CPU */}
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">CPU</span>
            <span className="font-bold text-cyan-300">{telemetry.cpuUsage}%</span>
          </div>

          {/* RAM */}
          <div className="flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">RAM</span>
            <span className="font-bold text-cyan-300">{telemetry.ramUsage}%</span>
          </div>

          {/* Network */}
          <div className="flex items-center gap-2 hidden sm:flex">
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">NET</span>
            <span className="font-bold text-cyan-300">{telemetry.networkSpeed}</span>
          </div>
        </div>

        {/* Center: Module Launcher Tabs */}
        <div className="flex items-center flex-wrap justify-center gap-1">
          {[
            { id: 'chat', label: 'VOICE AI', icon: MessageSquare },
            { id: 'os', label: 'COMPUTER CONTROL', icon: Terminal },
            { id: 'files', label: 'FILES & PDF', icon: Folder },
            { id: 'spotify', label: 'SPOTIFY', icon: Music },
            { id: 'memory', label: 'MEMORY DB', icon: Brain },
            { id: 'search', label: 'WEB SEARCH', icon: Globe },
            { id: 'architecture', label: 'ARCHITECTURE & README', icon: FileCode2 },
            { id: 'tests', label: 'TEST SUITE', icon: FlaskConical },
          ].map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                id={`tab-${id}`}
                onClick={() => onSelectTab(id as ActiveTab)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono-cyber font-medium flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/80 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                    : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Connection State */}
        <div className="flex items-center gap-2 text-cyan-400">
          <span className="tracking-widest font-semibold text-[11px]">CONNECTED</span>
          <Wifi className="w-4 h-4 text-cyan-400 animate-pulse" />
        </div>

      </div>
    </footer>
  );
};
