import React, { useState, useEffect, useRef } from 'react';
import { Mic, Terminal, Volume2, Sparkles, Folder, Music, Brain, Globe, FileCode2, FlaskConical, Play, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { HeaderHUD } from './components/HeaderHUD';
import { ArcReactor } from './components/ArcReactor';
import { AudioWaveform } from './components/AudioWaveform';
import { SystemStatusPanel } from './components/SystemStatusPanel';
import { TelemetryBar, ActiveTab } from './components/TelemetryBar';
import { VoiceChatHUD } from './components/VoiceChatHUD';
import { ComputerControlHUD } from './components/ComputerControlHUD';
import { FileManagerHUD } from './components/FileManagerHUD';
import { SpotifyHUD } from './components/SpotifyHUD';
import { MemoryHUD } from './components/MemoryHUD';
import { WebSearchHUD } from './components/WebSearchHUD';
import { ArchitectureDocsHUD } from './components/ArchitectureDocsHUD';
import { TestRunnerHUD } from './components/TestRunnerHUD';
import { OpenJarvisHUD } from './components/OpenJarvisHUD';
import { AudioHUD } from './components/AudioHUD';

import { AssistantState, CommandLog, SystemTelemetry, GeneratedDocument, MemoryEntry, SpotifyState } from './types';
import { speechEngine } from './audio/speechEngine';
import { soundFx } from './audio/soundFx';

export default function App() {
  // AI Assistant State
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [jarvisSpeech, setJarvisSpeech] = useState<string>('At your service, Sir. All systems operating at optimum efficiency.');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [wakeWord, setWakeWord] = useState<string>('jarvis');
  
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');

  // Command History Logs
  const [logs, setLogs] = useState<CommandLog[]>([
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString(),
      command: 'System Boot & Diagnostic Protocol',
      type: 'system',
      status: 'success',
      output: 'OS Bridge attached. Web Audio Synthesizer initialized. Voice recognition standby.',
    },
  ]);

  // System Telemetry
  const [telemetry, setTelemetry] = useState<SystemTelemetry>({
    cpuUsage: 23,
    ramUsage: 45,
    networkSpeed: '12.4 KB/s',
    powerCore: 100,
    uptimeSeconds: 0,
    isOnline: true,
    platform: 'Linux / Cloud Runtime (x86_64)',
    nodeVersion: 'v22.14.0',
    hostname: 'jarvis-core',
  });

  // Persisted Documents
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);

  // Persisted Memories
  const [memories, setMemories] = useState<MemoryEntry[]>([]);

  // Spotify State
  const [spotifyState, setSpotifyState] = useState<SpotifyState>({
    isPlaying: false,
    currentTrack: {
      id: 'track-1',
      title: 'Drive (Synthwave Odyssey)',
      artist: 'Kavinsky & Daft Punk',
      album: 'Nightcall Remaster',
      durationSec: 225,
      coverUrl: '',
    },
    volume: 85,
    progressSec: 42,
    shuffle: false,
    repeat: true,
  });

  // Track speech processing lock and state refs for stale closure prevention
  const isProcessingRef = useRef(false);
  const assistantStateRef = useRef<AssistantState>('idle');

  // Keep assistantStateRef synchronized
  useEffect(() => {
    assistantStateRef.current = assistantState;
  }, [assistantState]);

  // Initialize Speech Engine & Fetch Subsystems
  useEffect(() => {
    // Poll Health & Telemetry
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setTelemetry((prev) => ({
            ...prev,
            cpuUsage: data.cpuUsage ?? prev.cpuUsage,
            ramUsage: data.ramUsage ?? prev.ramUsage,
            uptimeSeconds: data.uptimeSeconds ?? prev.uptimeSeconds,
            platform: data.platform ?? prev.platform,
            nodeVersion: data.nodeVersion ?? prev.nodeVersion,
          }));
        }
      } catch (e) {}
    };

    const fetchDocuments = async () => {
      try {
        const res = await fetch('/api/files');
        if (res.ok) {
          const data = await res.json();
          setDocuments(data);
        }
      } catch (e) {}
    };

    const fetchMemories = async () => {
      try {
        const res = await fetch('/api/memory');
        if (res.ok) {
          const data = await res.json();
          setMemories(data);
        }
      } catch (e) {}
    };

    fetchHealth();
    fetchDocuments();
    fetchMemories();

    const telemetryInterval = setInterval(fetchHealth, 8000);

    // Setup Speech callbacks
    const unsubTranscript = speechEngine.onTranscript((text, isFinal) => {
      setTranscript(text);
      const lower = text.toLowerCase();

      // Check for wake word trigger
      if (lower.includes(wakeWord.toLowerCase()) && !isProcessingRef.current) {
        // Strip wake word to extract command
        const commandAfterWake = lower.split(wakeWord.toLowerCase())[1]?.trim() || '';
        if (commandAfterWake.length > 2) {
          handleExecuteNaturalCommand(commandAfterWake, 'voice');
        }
      } else if (isFinal && text.trim().length > 3 && !isProcessingRef.current) {
        handleExecuteNaturalCommand(text.trim(), 'voice');
      }
    });

    const unsubState = speechEngine.onStateChange((listening) => {
      setIsListening(listening);
      const current = assistantStateRef.current;
      if (listening && current === 'idle') {
        assistantStateRef.current = 'listening';
        setAssistantState('listening');
      } else if (!listening && current === 'listening') {
        assistantStateRef.current = 'idle';
        setAssistantState('idle');
      }
    });

    return () => {
      clearInterval(telemetryInterval);
      unsubTranscript();
      unsubState();
    };
  }, [wakeWord]);

  // Main Command Handler (Natural Language + OS Execution Bridge)
  const handleExecuteNaturalCommand = async (commandText: string, type: 'voice' | 'text' = 'text') => {
    if (!commandText || isProcessingRef.current) return;
    isProcessingRef.current = true;

    setAssistantState('processing');
    soundFx.playScanChirp();

    const newLogId = `log-${Date.now()}`;
    const initialLog: CommandLog = {
      id: newLogId,
      timestamp: new Date().toLocaleTimeString(),
      command: commandText,
      type,
      status: 'pending',
    };

    setLogs((prev) => [...prev, initialLog]);

    try {
      // Send to server-side Gemini API brain
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commandText }),
      });

      const data = await response.json();
      const speech = data.speechResponse || 'Command processed, Sir.';
      setJarvisSpeech(speech);

      // Execute any associated tool action
      if (data.actionType && data.actionType !== 'none') {
        setAssistantState('executing');
        soundFx.playConfirmSound();

        if (data.actionType === 'open_app' && data.actionPayload?.appName) {
          await handleLaunchDesktopApp(data.actionPayload.appName);
        } else if (data.actionType === 'write_file' && data.actionPayload) {
          await handleSaveDocument(data.actionPayload);
        } else if (data.actionType === 'control_spotify') {
          handleToggleSpotifyPlay();
        } else if (data.actionType === 'take_screenshot') {
          await handleTakeScreenshot();
        }
      }

      // Update log
      setLogs((prev) =>
        prev.map((l) =>
          l.id === newLogId
            ? { ...l, status: 'success', output: speech, actionTaken: data.actionType }
            : l
        )
      );

      // Speak response verbally with Jarvis voice
      setAssistantState('speaking');
      await speechEngine.speak(speech, () => {
        setAssistantState(isListening ? 'listening' : 'idle');
        isProcessingRef.current = false;
      });

    } catch (err: any) {
      console.error('Command processing error:', err);
      soundFx.playErrorAlert();
      setAssistantState('error');

      setLogs((prev) =>
        prev.map((l) =>
          l.id === newLogId
            ? { ...l, status: 'failed', output: `Error: ${err.message}` }
            : l
        )
      );

      setTimeout(() => {
        setAssistantState(isListening ? 'listening' : 'idle');
        isProcessingRef.current = false;
      }, 2000);
    }
  };

  // OS Actions
  const handleExecuteOSCommand = async (command: string) => {
    const res = await fetch('/api/os/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    return res.json();
  };

  const handleLaunchDesktopApp = async (appName: string) => {
    const res = await fetch('/api/os/launch-app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName }),
    });
    return res.json();
  };

  const handleTakeScreenshot = async () => {
    const res = await fetch('/api/os/screenshot', { method: 'POST' });
    return res.json();
  };

  // Document Management
  const handleSaveDocument = async (doc: { title: string; content: string; format: 'md' | 'txt' | 'json' | 'pdf' }) => {
    const res = await fetch('/api/files/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    const data = await res.json();
    if (data.success && data.document) {
      setDocuments((prev) => [data.document, ...prev.filter((d) => d.filename !== data.document.filename)]);
    }
    return data;
  };

  const handleDeleteDocument = async (id: string) => {
    const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
    return data;
  };

  // Memory Management
  const handleAddMemory = async (entry: { key: string; value: string; category: 'preference' | 'fact' | 'system' | 'session' }) => {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    const data = await res.json();
    if (data.success && data.memory) {
      setMemories((prev) => [...prev.filter((m) => m.key !== data.memory.key), data.memory]);
    }
    return data;
  };

  const handleDeleteMemory = async (id: string) => {
    const res = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setMemories((prev) => prev.filter((m) => m.id !== id));
    }
    return data;
  };

  // Web Search Query
  const handleWebSearch = async (query: string) => {
    return handleExecuteNaturalCommand(`search the web for: ${query}`, 'text');
  };

  // Test Suite Execution
  const handleRunTests = async () => {
    const res = await fetch('/api/tests/run');
    return res.json();
  };

  // Spotify Controls
  const handleToggleSpotifyPlay = () => {
    soundFx.playHudClick();
    setSpotifyState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleNextTrack = () => {
    soundFx.playHudClick();
    setSpotifyState((prev) => ({
      ...prev,
      currentTrack: {
        id: 'track-2',
        title: 'Stark Tower Ambient Pulse',
        artist: 'Ramin Djawadi',
        album: 'Iron Man OST (Cybernetic Edit)',
        durationSec: 252,
        coverUrl: '',
      },
      progressSec: 0,
      isPlaying: true,
    }));
  };

  const handlePrevTrack = () => {
    soundFx.playHudClick();
    setSpotifyState((prev) => ({
      ...prev,
      currentTrack: {
        id: 'track-3',
        title: 'Cyberpunk Overdrive',
        artist: 'Hyper',
        album: 'Neon Grid',
        durationSec: 190,
        coverUrl: '',
      },
      progressSec: 0,
      isPlaying: true,
    }));
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFx.setEnabled(next);
  };

  const handleToggleVoice = () => {
    const started = speechEngine.toggleListening();
    setIsListening(started);
    if (started) {
      setAssistantState('listening');
    } else {
      setAssistantState('idle');
    }
  };

  return (
    <div className="min-h-screen bg-[#020408] text-[#e2e8f0] flex flex-col justify-between cyber-grid selection:bg-[#00f2ff]/30 selection:text-[#00f2ff]">
      
      {/* Top Futuristic Header HUD */}
      <HeaderHUD
        isListening={isListening}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onToggleVoice={handleToggleVoice}
        statusText={
          assistantState === 'listening'
            ? 'LISTENING TO VOCAL INPUT'
            : assistantState === 'speaking'
            ? 'VOCAL SYNTHESIS ACTIVE'
            : assistantState === 'processing'
            ? 'PROCESSING NEURAL INTENT'
            : assistantState === 'executing'
            ? 'EXECUTING OS DIRECTIVE'
            : 'SYSTEM ONLINE'
        }
      />

      {/* Main Center Stage Matching Reference Image */}
      <main className="w-full max-w-7xl mx-auto px-4 py-4 flex-1 flex flex-col justify-between relative z-10">
        
        {/* Upper Hero Grid: Left Hero Branding, Center Arc Reactor, Right System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center my-auto">
          
          {/* Left Column: "MAKE YOUR OWN JARVIS VOICE ASSISTANT" */}
          <div className="lg:col-span-4 space-y-4 text-center lg:text-left">
            <div className="space-y-1">
              <div className="font-mono-cyber text-xs tracking-[0.3em] text-cyan-400 font-semibold uppercase">
                MAKE YOUR OWN
              </div>
              <h1 className="font-orbitron font-extrabold text-4xl sm:text-5xl tracking-[0.2em] text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.7)]">
                JARVIS
              </h1>
              <div className="font-mono-cyber text-sm tracking-[0.25em] text-cyan-200 uppercase font-medium">
                VOICE ASSISTANT
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center lg:justify-start gap-3">
              <button
                id="hero-voice-button"
                onClick={handleToggleVoice}
                className={`p-3.5 rounded-full border transition-all duration-300 flex items-center justify-center ${
                  isListening
                    ? 'bg-cyan-500 text-black border-cyan-200 shadow-[0_0_25px_#22d3ee] scale-105 animate-pulse'
                    : 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                }`}
                title="Click to Activate Voice Recognition"
              >
                <Mic className="w-6 h-6" />
              </button>
              
              <div className="text-left font-mono-cyber">
                <div className="text-[11px] font-bold text-cyan-300 tracking-wider">
                  BUILT BY YOU.
                </div>
                <div className="text-[10px] text-slate-400 tracking-wider">
                  POWERED BY INTELLIGENCE.
                </div>
              </div>
            </div>

            {/* Quick Wake-Word Notice */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-cyan-950/40 border border-cyan-800/40 text-[11px] font-mono-cyber text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Say <strong className="text-white">"Jarvis"</strong> or click the microphone to command</span>
            </div>
          </div>

          {/* Center Column: Pulsating Holographic Arc Reactor */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center">
            <ArcReactor
              state={assistantState}
              onClick={() => {
                handleExecuteNaturalCommand('Status report on all subsystems and security protocol', 'text');
              }}
            />
          </div>

          {/* Right Column: System Status HUD Panel */}
          <div className="lg:col-span-4 flex justify-center lg:justify-end">
            <SystemStatusPanel
              state={assistantState}
              isListening={isListening}
              powerCore={telemetry.powerCore}
              onRunDiagnostic={() => handleExecuteNaturalCommand('Run full system diagnostics', 'text')}
              onQuickAction={(cmd) => handleExecuteNaturalCommand(cmd, 'text')}
            />
          </div>

        </div>

        {/* Dynamic Center Audio Waveform Visualizer */}
        <div className="w-full flex flex-col items-center justify-center my-2">
          <AudioWaveform state={assistantState} isListening={isListening} />
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        </div>

        {/* Lower Interactive Module Workspace (Rendered based on Active Tab) */}
        <div className="w-full mt-2 mb-4">
          {activeTab === 'chat' && (
            <VoiceChatHUD
              state={assistantState}
              isListening={isListening}
              transcript={transcript}
              jarvisSpeech={jarvisSpeech}
              logs={logs}
              onToggleListen={handleToggleVoice}
              onSubmitCommand={(cmd) => handleExecuteNaturalCommand(cmd, 'text')}
              onReplaySpeech={() => speechEngine.speak(jarvisSpeech)}
              wakeWord={wakeWord}
              onSetWakeWord={(w) => {
                setWakeWord(w);
                speechEngine.setWakeWord(w);
              }}
            />
          )}

          {activeTab === 'audio' && (
            <AudioHUD />
          )}

          {activeTab === 'openjarvis' && (
            <OpenJarvisHUD />
          )}

          {activeTab === 'os' && (
            <ComputerControlHUD
              onExecuteCommand={handleExecuteOSCommand}
              onLaunchApp={handleLaunchDesktopApp}
              onTakeScreenshot={handleTakeScreenshot}
            />
          )}

          {activeTab === 'files' && (
            <FileManagerHUD
              documents={documents}
              onSaveDocument={handleSaveDocument}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {activeTab === 'spotify' && (
            <SpotifyHUD
              spotifyState={spotifyState}
              onTogglePlay={handleToggleSpotifyPlay}
              onNextTrack={handleNextTrack}
              onPrevTrack={handlePrevTrack}
              onSetVolume={(vol) => setSpotifyState((prev) => ({ ...prev, volume: vol }))}
            />
          )}

          {activeTab === 'memory' && (
            <MemoryHUD
              memories={memories}
              onAddMemory={handleAddMemory}
              onDeleteMemory={handleDeleteMemory}
            />
          )}

          {activeTab === 'search' && (
            <WebSearchHUD onSearch={handleWebSearch} />
          )}

          {activeTab === 'architecture' && (
            <ArchitectureDocsHUD />
          )}

          {activeTab === 'tests' && (
            <TestRunnerHUD onRunTests={handleRunTests} />
          )}
        </div>

      </main>

      {/* Bottom Telemetry Bar */}
      <TelemetryBar
        telemetry={telemetry}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          soundFx.playHudClick();
          setActiveTab(tab);
        }}
      />

    </div>
  );
}
