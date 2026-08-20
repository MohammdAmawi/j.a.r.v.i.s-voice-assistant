import React, { useState } from 'react';
import { Terminal, AppWindow, Camera, Lock, Monitor, Play, RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { soundFx } from '../audio/soundFx';

interface ComputerControlHUDProps {
  onExecuteCommand: (cmd: string) => Promise<any>;
  onLaunchApp: (appName: string) => Promise<any>;
  onTakeScreenshot: () => Promise<any>;
}

export const ComputerControlHUD: React.FC<ComputerControlHUDProps> = ({
  onExecuteCommand,
  onLaunchApp,
  onTakeScreenshot,
}) => {
  const [customCmd, setCustomCmd] = useState('uname -a');
  const [cmdOutput, setCmdOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const desktopApps = [
    { name: 'VS Code', command: 'code .', icon: '💻', desc: 'Primary IDE & Source Editor' },
    { name: 'Google Chrome', command: 'google-chrome', icon: '🌐', desc: 'Web Browser & DevTools' },
    { name: 'Spotify', command: 'spotify', icon: '🎵', desc: 'Audio & Music Player' },
    { name: 'Terminal', command: 'x-terminal-emulator', icon: '⚡', desc: 'Native OS Shell' },
    { name: 'File Explorer', command: 'xdg-open .', icon: '📁', desc: 'Local Workspace Directory' },
    { name: 'Calculator', command: 'calc', icon: '🧮', desc: 'Scientific Math Engine' },
  ];

  const handleLaunch = async (appName: string) => {
    soundFx.playScanChirp();
    setStatusNotice(`Instructing OS kernel to launch ${appName}...`);
    try {
      const res = await onLaunchApp(appName);
      soundFx.playConfirmSound();
      setStatusNotice(res.message || `Launched ${appName}`);
    } catch (e: any) {
      soundFx.playErrorAlert();
      setStatusNotice(`Failed to launch ${appName}: ${e.message}`);
    }
  };

  const handleRunCommand = async (e?: React.FormEvent | string) => {
    if (e && typeof e !== 'string') e.preventDefault();
    const cmd = typeof e === 'string' ? e : customCmd;
    if (!cmd.trim()) return;

    setIsRunning(true);
    soundFx.playScanChirp();
    setCmdOutput(`$ ${cmd}\nExecuting via child_process bridge...`);

    try {
      const res = await onExecuteCommand(cmd.trim());
      if (res.success) {
        soundFx.playConfirmSound();
        setCmdOutput(`$ ${res.command}\n${res.output || '(No stdout)'}`);
      } else {
        soundFx.playErrorAlert();
        setCmdOutput(`$ ${res.command}\n[ERROR]: ${res.output || res.error || 'Execution failed'}`);
      }
    } catch (err: any) {
      soundFx.playErrorAlert();
      setCmdOutput(`[FATAL]: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCaptureScreen = async () => {
    soundFx.playScanChirp();
    setStatusNotice('Capturing full viewport desktop screenshot...');
    try {
      const res = await onTakeScreenshot();
      soundFx.playConfirmSound();
      if (res.mockUrl) {
        setScreenshotUrl(res.mockUrl);
      }
      setStatusNotice(res.message || 'Screenshot captured successfully');
    } catch (e: any) {
      soundFx.playErrorAlert();
      setStatusNotice(`Screenshot capture failed: ${e.message}`);
    }
  };

  return (
    <div className="w-full flex flex-col gap-5 text-slate-200">
      
      {/* Top Notification Banner if any */}
      {statusNotice && (
        <div className="px-3 py-2 bg-cyan-950/70 border border-cyan-500/50 rounded flex items-center justify-between text-xs font-mono-cyber text-cyan-300">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            {statusNotice}
          </span>
          <button
            onClick={() => setStatusNotice(null)}
            className="text-slate-400 hover:text-white text-[11px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid: App Launchpad & Screen Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* App Launcher (2 Columns) */}
        <div className="md:col-span-2 hud-panel rounded p-4 border border-cyan-500/30">
          <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <AppWindow className="w-4 h-4 text-cyan-400" />
              <h3 className="font-orbitron text-xs font-bold tracking-wider text-cyan-300">
                PRO DESKTOP APPLICATION LAUNCHPAD
              </h3>
            </div>
            <span className="text-[10px] font-mono-cyber text-slate-400">
              OS-Level Hook (child_process)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {desktopApps.map((app) => (
              <button
                key={app.name}
                onClick={() => handleLaunch(app.name)}
                className="p-3 rounded bg-black/40 hover:bg-cyan-950/60 border border-cyan-900/40 hover:border-cyan-400/60 transition-all text-left group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{app.icon}</span>
                  <span className="text-[9px] font-mono-cyber text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-700">
                    LAUNCH ↗
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-xs text-cyan-200 group-hover:text-cyan-100">
                    {app.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono-cyber mt-0.5 truncate">
                    {app.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Screen & Hardware Control Panel */}
        <div className="hud-panel rounded p-4 border border-cyan-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-cyan-900/60 pb-2 mb-3">
              <Monitor className="w-4 h-4 text-cyan-400" />
              <h3 className="font-orbitron text-xs font-bold tracking-wider text-cyan-300">
                SCREEN & OS CONTROLS
              </h3>
            </div>

            <div className="space-y-2 font-mono-cyber text-xs">
              <button
                onClick={handleCaptureScreen}
                className="w-full p-2.5 rounded bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-600/50 text-cyan-200 flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  Take Screenshot
                </span>
                <span className="text-[10px] text-cyan-400">EXEC</span>
              </button>

              <button
                onClick={() => handleLaunch('Lock Workstation')}
                className="w-full p-2.5 rounded bg-black/40 hover:bg-cyan-950/60 border border-cyan-900/40 text-slate-300 flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  Lock Workstation
                </span>
                <span className="text-[10px] text-slate-400">SECURE</span>
              </button>

              <button
                onClick={() => handleRunCommand('ls -la && df -h')}
                className="w-full p-2.5 rounded bg-black/40 hover:bg-cyan-950/60 border border-cyan-900/40 text-slate-300 flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  Check Storage & Disks
                </span>
                <span className="text-[10px] text-slate-400">SYS</span>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-cyan-900/60 text-[10px] font-mono-cyber text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Security Guardrails Active (Sandboxed)
          </div>
        </div>

      </div>

      {/* Screenshot Preview Modal/Box if captured */}
      {screenshotUrl && (
        <div className="hud-panel rounded p-4 border border-cyan-500/40">
          <div className="flex items-center justify-between mb-2">
            <span className="font-orbitron text-xs font-semibold text-cyan-300">
              LATEST DISPLAY SNAPSHOT
            </span>
            <button
              onClick={() => setScreenshotUrl(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              CLOSE
            </button>
          </div>
          <div className="rounded overflow-hidden border border-cyan-800 bg-black flex items-center justify-center p-2">
            <img
              src={screenshotUrl}
              alt="JARVIS Screen Snapshot"
              className="max-h-60 rounded object-contain"
            />
          </div>
        </div>
      )}

      {/* Live Shell Terminal Bridge */}
      <div className="hud-panel rounded p-4 border border-cyan-500/30">
        <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="font-orbitron text-xs font-bold tracking-wider text-cyan-300">
              DIRECT OS SHELL TERMINAL (NODE CHILD_PROCESS)
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono-cyber text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            SHELL ATTACHED
          </div>
        </div>

        {/* Command Output Terminal Screen */}
        <div className="bg-black/80 rounded p-3 font-mono text-xs text-emerald-400 border border-cyan-900/60 h-44 overflow-y-auto whitespace-pre-wrap select-text">
          {cmdOutput || `$ jarvis --status\n[J.A.R.V.I.S OS Bridge ready. Type any shell command below.]`}
        </div>

        {/* Command Line Input */}
        <form onSubmit={handleRunCommand} className="mt-3 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-black/60 border border-cyan-700/60 rounded px-3 py-2">
            <span className="text-cyan-400 font-mono text-xs font-bold">$</span>
            <input
              type="text"
              value={customCmd}
              onChange={(e) => setCustomCmd(e.target.value)}
              placeholder="Enter OS command (e.g. node -v, ls, whoami, ps aux, git status)..."
              className="w-full bg-transparent text-xs font-mono-cyber text-cyan-100 placeholder-slate-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isRunning}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold rounded font-orbitron text-xs tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.4)]"
          >
            <Play className="w-3.5 h-3.5" />
            {isRunning ? 'RUNNING...' : 'EXECUTE'}
          </button>
        </form>
      </div>

    </div>
  );
};
