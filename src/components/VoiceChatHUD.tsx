import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Sparkles, Volume2, RotateCcw, ShieldCheck, Terminal, Bot } from 'lucide-react';
import { AssistantState, CommandLog } from '../types';
import { soundFx } from '../audio/soundFx';

interface VoiceChatHUDProps {
  state: AssistantState;
  isListening: boolean;
  transcript: string;
  jarvisSpeech: string;
  logs: CommandLog[];
  onToggleListen: () => void;
  onSubmitCommand: (text: string) => void;
  onReplaySpeech: () => void;
  wakeWord: string;
  onSetWakeWord: (word: string) => void;
}

export const VoiceChatHUD: React.FC<VoiceChatHUDProps> = ({
  state,
  isListening,
  transcript,
  jarvisSpeech,
  logs,
  onToggleListen,
  onSubmitCommand,
  onReplaySpeech,
  wakeWord,
  onSetWakeWord,
}) => {
  const [inputText, setInputText] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    soundFx.playScanChirp();
    onSubmitCommand(inputText.trim());
    setInputText('');
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 text-slate-200">
      
      {/* Top Banner / Live Speech Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* User Speech Transcript Box */}
        <div className="hud-panel rounded p-4 border border-cyan-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mic className={`w-4 h-4 ${isListening ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="font-orbitron text-xs font-semibold text-cyan-300 tracking-wider">
                  VOICE RECOGNITION (STT)
                </span>
              </div>
              <span className="font-mono-cyber text-[10px] text-cyan-400/80 px-2 py-0.5 bg-cyan-950/60 rounded border border-cyan-800/60">
                WAKE WORD: "{wakeWord}"
              </span>
            </div>
            
            <p className="text-sm font-mono-cyber min-h-[48px] text-cyan-100 bg-black/40 p-2.5 rounded border border-cyan-900/40">
              {transcript || (
                <span className="text-slate-500 italic">
                  {isListening ? `Listening... Say "${wakeWord}" followed by a command...` : 'Microphone standby. Click Voice or speak wake word.'}
                </span>
              )}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={onToggleListen}
              className={`px-3 py-1.5 rounded font-mono-cyber text-xs font-medium flex items-center gap-2 transition-all ${
                isListening
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/60 hover:bg-rose-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 hover:bg-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              {isListening ? 'MUTE MICROPHONE' : 'ENGAGE LISTENING'}
            </button>
            <span className="text-[10px] font-mono-cyber text-slate-400">
              Web Speech API v2
            </span>
          </div>
        </div>

        {/* J.A.R.V.I.S Spoken Response Box */}
        <div className="hud-panel rounded p-4 border border-cyan-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-300" />
                <span className="font-orbitron text-xs font-semibold text-cyan-300 tracking-wider">
                  J.A.R.V.I.S VOCAL SYNTHESIS (TTS)
                </span>
              </div>
              <span className={`font-mono-cyber text-[10px] px-2 py-0.5 rounded border ${
                state === 'speaking' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 animate-pulse' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {state === 'speaking' ? 'SPEAKING' : 'READY'}
              </span>
            </div>

            <p className="text-sm font-mono-cyber min-h-[48px] text-cyan-200 bg-black/40 p-2.5 rounded border border-cyan-900/40">
              {jarvisSpeech || 'At your service, Sir. All systems operating at optimum efficiency.'}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={onReplaySpeech}
              className="px-3 py-1.5 rounded font-mono-cyber text-xs font-medium bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 flex items-center gap-1.5 transition-all"
            >
              <Volume2 className="w-3.5 h-3.5" />
              REPLAY AUDIO
            </button>
            <span className="text-[10px] font-mono-cyber text-slate-400">
              Tone: British / Resonant
            </span>
          </div>
        </div>

      </div>

      {/* Live Command Logs Terminal Feed */}
      <div className="flex-1 hud-panel rounded p-4 border border-cyan-500/30 flex flex-col min-h-[220px]">
        <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-orbitron text-xs font-semibold text-cyan-300 tracking-wider">
              REAL-TIME NEURAL COMMAND LOG
            </span>
          </div>
          <span className="text-[10px] font-mono-cyber text-slate-400">
            {logs.length} ENTRIES RECORDED
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-56 font-mono-cyber text-xs">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic p-4 text-center">
              No recent commands. Try saying "Jarvis, open VS Code" or "Jarvis, take a screenshot".
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-2 rounded bg-black/50 border border-cyan-900/40 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px]">[{log.timestamp}]</span>
                    <span className="font-semibold text-cyan-300">› {log.command}</span>
                    <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
                      {log.type}
                    </span>
                  </div>
                  {log.output && (
                    <div className="text-slate-300 pl-4 text-[11px] whitespace-pre-wrap font-mono">
                      {log.output}
                    </div>
                  )}
                </div>

                <span
                  className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    log.status === 'success'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60'
                      : log.status === 'failed'
                      ? 'bg-rose-950/80 text-rose-400 border border-rose-700/60'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-700/60 animate-pulse'
                  }`}
                >
                  {log.status}
                </span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              id="jarvis-command-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter direct command (e.g. 'Draft executive briefing', 'Launch Spotify', 'Capture screen')..."
              className="w-full bg-black/60 border border-cyan-700/60 rounded px-3 py-2 text-xs font-mono-cyber text-cyan-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded font-orbitron text-xs tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)]"
          >
            <Send className="w-3.5 h-3.5" />
            EXECUTE
          </button>
        </form>
      </div>

    </div>
  );
};
