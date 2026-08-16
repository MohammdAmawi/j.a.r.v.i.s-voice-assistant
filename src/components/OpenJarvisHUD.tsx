import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  Send, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  RotateCcw, 
  Sparkles, 
  Bot, 
  Cpu, 
  FolderGit2,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { queryOpenJarvis } from '../services/openJarvisService';
import { soundFx } from '../audio/soundFx';

interface QueryHistoryItem {
  id: string;
  prompt: string;
  response: string;
  timestamp: string;
  status: 'success' | 'error';
}

const QUICK_SUGGESTIONS = [
  'List all system capabilities and available tools',
  'What is the current status of the local environment?',
  'Explain how OpenJarvis integrates with Electron',
  'Write a Python function to monitor system memory',
];

export const OpenJarvisHUD: React.FC = () => {
  // Input and Core Async States
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Session History
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const responseEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (response || errorMessage) {
      responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [response, errorMessage, isLoading]);

  // Main Submit Handler
  const handleQuerySubmit = async (promptToSend?: string) => {
    const activePrompt = (promptToSend || prompt).trim();
    if (!activePrompt || isLoading) return;

    // Reset alert and set loading state
    setErrorMessage(null);
    setIsLoading(true);
    setResponse(null);
    soundFx.playScanChirp();

    const timestamp = new Date().toLocaleTimeString();
    const queryId = `oj-${Date.now()}`;

    try {
      // Execute asynchronous query to local OpenJarvis CLI via IPC
      const output = await queryOpenJarvis(activePrompt);
      
      setResponse(output);
      soundFx.playConfirmSound();

      // Append to session query history
      setHistory((prev) => [
        ...prev,
        {
          id: queryId,
          prompt: activePrompt,
          response: output,
          timestamp,
          status: 'success',
        },
      ]);

      // Clear input on success
      setPrompt('');
    } catch (err: any) {
      const errorText = err?.message || 'Failed to communicate with OpenJarvis CLI.';
      setErrorMessage(errorText);
      soundFx.playErrorAlert();

      // Log failure in history
      setHistory((prev) => [
        ...prev,
        {
          id: queryId,
          prompt: activePrompt,
          response: `Error: ${errorText}`,
          timestamp,
          status: 'error',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuerySubmit();
    }
  };

  const handleCopyResponse = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearHistory = () => {
    setHistory([]);
    setResponse(null);
    setErrorMessage(null);
    soundFx.playHudClick();
  };

  return (
    <div className="w-full flex flex-col gap-4 text-slate-200">
      
      {/* Top Banner: Engine Status & Telemetry Header */}
      <div className="hud-panel rounded p-4 border border-cyan-500/40 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-900/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-cyan-950/80 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Bot className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-orbitron text-sm font-bold text-cyan-300 tracking-wider">
                  OPENJARVIS LOCAL ENGINE GATEWAY
                </h2>
                <span className="text-[10px] font-mono-cyber px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700/60 text-cyan-300">
                  v1.0 CLI
                </span>
              </div>
              <p className="text-xs font-mono-cyber text-slate-400 mt-0.5">
                IPC Channel: <span className="text-cyan-400">ask-jarvis</span> &bull; CWD: <span className="text-slate-300">C:\Users\DELL\AppData\Local\OpenJarvis\src</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono-cyber text-xs">
            <span className={`px-2.5 py-1 rounded flex items-center gap-1.5 border ${
              isLoading
                ? 'bg-amber-950/60 text-amber-300 border-amber-500/50 animate-pulse'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              {isLoading ? 'EXECUTING CLI' : 'STANDBY / READY'}
            </span>

            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="px-2.5 py-1 rounded bg-slate-900/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/60 flex items-center gap-1 transition-all"
                title="Clear Session History"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>CLEAR</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono-cyber text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Quick Prompts:
          </span>
          {QUICK_SUGGESTIONS.map((sug, idx) => (
            <button
              key={idx}
              disabled={isLoading}
              onClick={() => handleQuerySubmit(sug)}
              className="text-[11px] font-mono-cyber px-2.5 py-1 rounded bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 hover:text-cyan-200 border border-cyan-800/60 hover:border-cyan-400/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace: Split View for Prompt Input & Active Response */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Interactive Prompt Console (5 cols) */}
        <div className="lg:col-span-5 hud-panel rounded p-4 border border-cyan-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="font-orbitron text-xs font-semibold text-cyan-300 tracking-wider">
                  PROMPT INPUT CONSOLE
                </span>
              </div>
              <span className="font-mono-cyber text-[10px] text-slate-500">
                Press Enter to send, Shift+Enter for new line
              </span>
            </div>

            <div className="relative">
              <textarea
                ref={inputRef}
                id="openjarvis-prompt-input"
                disabled={isLoading}
                rows={6}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter prompt for OpenJarvis (e.g. 'Summarize today\'s scheduled tasks', 'Run diagnostics and report system health')..."
                className="w-full bg-black/60 border border-cyan-800/80 rounded p-3 text-xs font-mono-cyber text-cyan-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={isLoading || !prompt.trim()}
              onClick={() => setPrompt('')}
              className="px-3 py-2 rounded text-xs font-mono-cyber text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-700 hover:border-slate-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              RESET
            </button>

            <button
              id="openjarvis-submit-btn"
              type="button"
              disabled={isLoading || !prompt.trim()}
              onClick={() => handleQuerySubmit()}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold rounded font-orbitron text-xs tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>PROCESSING...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>SEND TO OPENJARVIS</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: AI Output Terminal Display (7 cols) */}
        <div className="lg:col-span-7 hud-panel rounded p-4 border border-cyan-500/30 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="font-orbitron text-xs font-semibold text-cyan-300 tracking-wider">
                  CLI STDOUT OUTPUT STREAM
                </span>
              </div>
              {response && (
                <button
                  onClick={handleCopyResponse}
                  className="px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-[11px] font-mono-cyber flex items-center gap-1 transition-all"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'COPIED' : 'COPY'}</span>
                </button>
              )}
            </div>

            {/* Error Message Alert Banner */}
            {errorMessage && (
              <div className="mb-3 p-3 rounded bg-rose-950/80 border border-rose-500/80 text-rose-200 flex items-start gap-3 text-xs font-mono-cyber animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-rose-300 mb-0.5">Execution Failed</div>
                  <p className="text-rose-200/90 whitespace-pre-wrap">{errorMessage}</p>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-rose-200 text-sm font-bold ml-2"
                  title="Dismiss error"
                >
                  &times;
                </button>
              </div>
            )}

            {/* Loading State Spinner Display */}
            {isLoading && (
              <div className="p-8 rounded bg-black/60 border border-cyan-500/30 flex flex-col items-center justify-center text-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                  <Bot className="w-5 h-5 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-orbitron font-semibold text-cyan-300 tracking-wider">
                    EXECUTING OPENJARVIS CLI QUERY
                  </p>
                  <p className="text-[11px] font-mono-cyber text-slate-400 mt-1">
                    Running <code className="text-cyan-400">uv run jarvis ask</code> in background thread...
                  </p>
                </div>
              </div>
            )}

            {/* Response Display Box with Whitespace Handling */}
            {!isLoading && response && (
              <div className="bg-black/70 border border-cyan-900/60 rounded p-3 text-xs font-mono-cyber text-cyan-100 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                {response}
              </div>
            )}

            {/* Empty Standby State */}
            {!isLoading && !response && !errorMessage && (
              <div className="p-8 rounded bg-black/40 border border-slate-800 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <HelpCircle className="w-8 h-8 text-slate-600" />
                <p className="text-xs font-mono-cyber">
                  No active query output. Type a prompt on the left or select a Quick Prompt above.
                </p>
              </div>
            )}
          </div>

          <div ref={responseEndRef} />
        </div>

      </div>

      {/* Session History Feed */}
      {history.length > 0 && (
        <div className="hud-panel rounded p-4 border border-cyan-500/30 flex flex-col">
          <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-cyan-400" />
              <span className="font-orbitron text-xs font-semibold text-cyan-300 tracking-wider">
                SESSION QUERY AUDIT LOG
              </span>
            </div>
            <span className="text-[10px] font-mono-cyber text-slate-400">
              {history.length} {history.length === 1 ? 'RECORD' : 'RECORDS'}
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {history.slice().reverse().map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded bg-black/60 border border-cyan-950 hover:border-cyan-800/60 transition-all text-xs font-mono-cyber"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px]">[{item.timestamp}]</span>
                    <span className="font-semibold text-cyan-300">› {item.prompt}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    item.status === 'success'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-slate-300 text-[11px] whitespace-pre-wrap pl-3 border-l border-cyan-900/60 mt-1 line-clamp-3 hover:line-clamp-none">
                  {item.response}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
