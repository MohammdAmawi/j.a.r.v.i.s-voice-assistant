import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  RotateCcw, 
  Sparkles, 
  Cpu, 
  Radio, 
  Activity, 
  AlertTriangle, 
  Bot, 
  Send, 
  CheckCircle2, 
  Headphones,
  Sliders,
  Copy,
  Check
} from 'lucide-react';
import { 
  captureSpeechSTT, 
  synthesizeSpeechTTS, 
  runFullVoiceSession, 
  playAudioStream, 
  stopAudioPlayback 
} from '../services/openJarvisAudioService';
import { soundFx } from '../audio/soundFx';
import { AudioTelemetry } from '../types';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

interface VoiceSessionLog {
  id: string;
  transcript: string;
  response: string;
  timestamp: string;
  audioDataUri?: string | null;
  durationMs: number;
}

export const AudioHUD: React.FC = () => {
  // Voice Lifecycle State
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [response, setResponse] = useState<string>('At your service, Sir. Audio engine calibrated.');
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Manual TTS Input State
  const [manualText, setManualText] = useState<string>('');
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);

  // Audio Telemetry
  const [telemetry, setTelemetry] = useState<AudioTelemetry>({
    sttEngine: 'faster-whisper (Native Edge)',
    ttsEngine: 'OpenJarvis Signature Neural Voice',
    sampleRate: 16000,
    latencyMs: 142,
    isHardwareConnected: true,
    status: 'ONLINE / ACTIVE',
  });

  // Session History
  const [logs, setLogs] = useState<VoiceSessionLog[]>([]);
  const stopAudioRef = useRef<(() => void) | null>(null);

  // Auto-recover from error state after 5 seconds
  useEffect(() => {
    if (voiceState !== 'error') return;
    const timeout = setTimeout(() => {
      setVoiceState('idle');
      setErrorMessage(null);
    }, 5000);
    return () => clearTimeout(timeout);
  }, [voiceState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioPlayback();
    };
  }, []);

  // Handler: Full Voice Interaction Pipeline
  const handleStartVoiceSession = async () => {
    if (voiceState === 'listening' || voiceState === 'processing') return;

    console.log('[Audio HUD] ENGAGE clicked. Current voiceState:', voiceState);
    setErrorMessage(null);
    setVoiceState('listening');
    soundFx.playScanChirp();

    try {
      // Step 1: Capture STT via faster-whisper
      console.log('[Audio HUD] Step 1: Calling captureSpeechSTT()...');
      const stt = await captureSpeechSTT();
      console.log('[Audio HUD] Step 1 complete. STT result:', { text: stt.text, durationMs: stt.durationMs, engine: stt.engine });
      
      if (!stt.text || !stt.text.trim()) {
        console.warn('[Audio HUD] STT returned empty transcript. No speech detected.');
        setVoiceState('idle');
        setErrorMessage('No audible voice detected by microphone. Please try again.');
        soundFx.playErrorAlert();
        return;
      }

      setTranscript(stt.text);
      setVoiceState('processing');

      // Step 2: Query OpenJarvis & Synthesize Voice
      console.log('[Audio HUD] Step 2: Calling runFullVoiceSession()...');
      const sessionResult = await runFullVoiceSession();
      console.log('[Audio HUD] Step 2 complete. Session result:', { transcript: sessionResult.transcript, response: sessionResult.response?.substring(0, 80), durationMs: sessionResult.durationMs, status: sessionResult.status });
      
      setTranscript(sessionResult.transcript || stt.text);
      setResponse(sessionResult.response);
      setAudioDataUri(sessionResult.audioDataUri || null);

      // Add to session history
      const logEntry: VoiceSessionLog = {
        id: `voice-${Date.now()}`,
        transcript: sessionResult.transcript || stt.text,
        response: sessionResult.response,
        timestamp: new Date().toLocaleTimeString(),
        audioDataUri: sessionResult.audioDataUri,
        durationMs: sessionResult.durationMs,
      };
      setLogs((prev) => [logEntry, ...prev]);

      // Step 3: Play Signature Voice Audio
      if (sessionResult.audioDataUri) {
        console.log('[Audio HUD] Step 3: Playing synthesized audio response...');
        setVoiceState('speaking');
        setIsPlayingAudio(true);

        stopAudioRef.current = playAudioStream(
          sessionResult.audioDataUri,
          () => {
            console.log('[Audio HUD] Audio playback ended.');
            setIsPlayingAudio(false);
            setVoiceState('idle');
          },
          (err) => {
            console.error('[Audio HUD] Audio playback error:', err.message);
            setIsPlayingAudio(false);
            setVoiceState('idle');
          }
        );
      } else {
        console.log('[Audio HUD] No audioDataUri returned. Voice session complete (text-only).');
        setVoiceState('idle');
        soundFx.playConfirmSound();
      }

    } catch (err: any) {
      console.error('[Audio HUD] Pipeline failure:', err?.message);
      console.error('[Audio HUD] Full error object:', err);
      setVoiceState('error');
      setErrorMessage(err?.message || 'Voice interaction failed.');
      soundFx.playErrorAlert();
    }
  };

  // Handler: Manual TTS Synthesizer
  const handleManualSynthesize = async () => {
    const textToSynth = manualText.trim();
    if (!textToSynth || isSynthesizing) return;

    setIsSynthesizing(true);
    setErrorMessage(null);
    soundFx.playScanChirp();

    try {
      const result = await synthesizeSpeechTTS(textToSynth);
      soundFx.playConfirmSound();

      if (result.audioDataUri) {
        setAudioDataUri(result.audioDataUri);
        setVoiceState('speaking');
        setIsPlayingAudio(true);

        stopAudioRef.current = playAudioStream(
          result.audioDataUri,
          () => {
            setIsPlayingAudio(false);
            setVoiceState('idle');
          },
          (err) => {
            setIsPlayingAudio(false);
            setVoiceState('idle');
          }
        );
      } else {
        setVoiceState('idle');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Speech synthesis failed.');
      soundFx.playErrorAlert();
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Handler: Replay Current Voice Response
  const handleReplay = () => {
    if (!audioDataUri) return;
    stopAudioPlayback();
    setVoiceState('speaking');
    setIsPlayingAudio(true);

    stopAudioRef.current = playAudioStream(
      audioDataUri,
      () => {
        setIsPlayingAudio(false);
        setVoiceState('idle');
      },
      (err) => {
        setIsPlayingAudio(false);
        setVoiceState('idle');
      }
    );
  };

  // Handler: Stop Audio Playback
  const handleStopAudio = () => {
    stopAudioPlayback();
    setIsPlayingAudio(false);
    if (voiceState === 'speaking') {
      setVoiceState('idle');
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-4 text-slate-200">
      
      {/* Top Banner: Voice Engine Diagnostic Header */}
      <div className="hud-panel rounded p-4 border border-cyan-500/40 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-900/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-cyan-950/80 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-orbitron text-sm font-bold text-cyan-300 tracking-wider">
                  NATIVE AUDIO & SIGNATURE VOICE HUD
                </h2>
                <span className="text-[10px] font-mono-cyber px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700/60 text-cyan-300">
                  FASTER-WHISPER + NEURAL TTS
                </span>
              </div>
              <p className="text-xs font-mono-cyber text-slate-400 mt-0.5">
                Engine: <span className="text-cyan-400">{telemetry.sttEngine}</span> &bull; Sample Rate: <span className="text-slate-300">16,000 Hz</span> &bull; Latency: <span className="text-emerald-400">~{telemetry.latencyMs}ms</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono-cyber text-xs">
            <span className={`px-3 py-1 rounded flex items-center gap-1.5 border font-semibold ${
              voiceState === 'listening'
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/70 animate-pulse'
                : voiceState === 'processing'
                ? 'bg-purple-950/80 text-purple-300 border-purple-500/70 animate-pulse'
                : voiceState === 'speaking'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/70 animate-pulse'
                : voiceState === 'error'
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/70'
                : 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                voiceState === 'listening' ? 'bg-amber-400 animate-ping' :
                voiceState === 'processing' ? 'bg-purple-400 animate-spin' :
                voiceState === 'speaking' ? 'bg-emerald-400 animate-ping' :
                voiceState === 'error' ? 'bg-rose-400' : 'bg-cyan-400'
              }`} />
              {voiceState === 'listening' && 'LISTENING (WHISPER)'}
              {voiceState === 'processing' && 'PROCESSING (OPENJARVIS)'}
              {voiceState === 'speaking' && 'SPEAKING (JARVIS VOICE)'}
              {voiceState === 'error' && 'AUDIO ENGINE ERROR'}
              {voiceState === 'idle' && 'SYSTEM READY'}
            </span>
          </div>
        </div>

        {/* Real-Time Audio Telemetry Specs */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono-cyber">
          <div className="p-2 rounded bg-black/40 border border-cyan-950 flex items-center justify-between">
            <span className="text-slate-400">STT Capture:</span>
            <span className="text-cyan-300 font-bold">faster-whisper</span>
          </div>
          <div className="p-2 rounded bg-black/40 border border-cyan-950 flex items-center justify-between">
            <span className="text-slate-400">TTS Engine:</span>
            <span className="text-cyan-300 font-bold">OpenJarvis Voice</span>
          </div>
          <div className="p-2 rounded bg-black/40 border border-cyan-950 flex items-center justify-between">
            <span className="text-slate-400">Audio Codec:</span>
            <span className="text-cyan-300 font-bold">PCM 16-bit WAV</span>
          </div>
          <div className="p-2 rounded bg-black/40 border border-cyan-950 flex items-center justify-between">
            <span className="text-slate-400">Hardware Bridge:</span>
            <span className="text-emerald-400 font-bold">Isolated Electron IPC</span>
          </div>
        </div>
      </div>

      {/* Error Alert Display */}
      {errorMessage && (
        <div className="p-3 rounded bg-rose-950/80 border border-rose-500/80 text-rose-200 flex items-start justify-between gap-3 text-xs font-mono-cyber animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-rose-300">Audio Pipeline Warning: </strong>
              <span>{errorMessage}</span>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 text-sm font-bold ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Center Interactive Microphone Console & Waveform Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Massive Central Voice Interaction Portal (5 cols) */}
        <div className="lg:col-span-5 hud-panel rounded p-6 border border-cyan-500/30 flex flex-col items-center justify-between text-center min-h-[360px] relative overflow-hidden">
          
          <div className="w-full flex items-center justify-between">
            <span className="font-orbitron text-xs font-semibold text-cyan-300 tracking-wider">
              VOICE ACTIVATION PORTAL
            </span>
            <span className="font-mono-cyber text-[10px] text-slate-400">
              One-Click Full Duplex Loop
            </span>
          </div>

          {/* Central Animated Interactive Orb Button */}
          <div className="relative my-6 flex items-center justify-center">
            
            {/* Pulsing Aura Rings */}
            {voiceState === 'listening' && (
              <div className="absolute w-44 h-44 rounded-full border-2 border-amber-400/40 animate-ping" />
            )}
            {voiceState === 'speaking' && (
              <div className="absolute w-44 h-44 rounded-full border-2 border-emerald-400/40 animate-ping" />
            )}
            {voiceState === 'processing' && (
              <div className="absolute w-40 h-40 rounded-full border-2 border-purple-400/50 border-t-transparent animate-spin" />
            )}

            {/* Glowing Backdrop Ring */}
            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              voiceState === 'listening'
                ? 'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.5)]'
                : voiceState === 'processing'
                ? 'bg-purple-500/20 border-2 border-purple-400 shadow-[0_0_35px_rgba(168,85,247,0.5)]'
                : voiceState === 'speaking'
                ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.5)]'
                : voiceState === 'error'
                ? 'bg-rose-500/20 border-2 border-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.4)]'
                : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-2 border-cyan-400/70 hover:border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.3)]'
            }`}>
              <button
                id="audio-microphone-trigger"
                onClick={handleStartVoiceSession}
                disabled={voiceState === 'listening' || voiceState === 'processing'}
                className="w-24 h-24 rounded-full bg-black/80 hover:bg-black/90 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:cursor-not-allowed group"
              >
                {voiceState === 'listening' ? (
                  <Mic className="w-8 h-8 text-amber-300 animate-pulse" />
                ) : voiceState === 'processing' ? (
                  <Cpu className="w-8 h-8 text-purple-300 animate-spin" />
                ) : voiceState === 'speaking' ? (
                  <Volume2 className="w-8 h-8 text-emerald-300 animate-bounce" />
                ) : (
                  <Mic className="w-8 h-8 text-cyan-400 group-hover:text-cyan-200 transition-colors" />
                )}
                
                <span className="font-orbitron text-[9px] font-bold tracking-widest text-slate-300 group-hover:text-cyan-300">
                  {voiceState === 'listening' ? 'RECORDING' :
                   voiceState === 'processing' ? 'INFERRING' :
                   voiceState === 'speaking' ? 'SPEAKING' : 'ENGAGE'}
                </span>
              </button>
            </div>
          </div>

          {/* Real-time Dynamic Waveform Bars */}
          <div className="w-full flex items-center justify-center gap-1.5 h-6 my-2">
            {[40, 65, 85, 100, 75, 45, 90, 60, 30, 80, 95, 50, 70, 85, 40].map((height, i) => (
              <div
                key={i}
                style={{
                  height: voiceState === 'listening' || voiceState === 'speaking' ? `${height}%` : '20%',
                  transition: 'height 0.15s ease-in-out',
                }}
                className={`w-1 rounded-full ${
                  voiceState === 'listening' ? 'bg-amber-400' :
                  voiceState === 'speaking' ? 'bg-emerald-400' :
                  voiceState === 'processing' ? 'bg-purple-400 animate-pulse' :
                  'bg-cyan-800/60'
                }`}
              />
            ))}
          </div>

          {/* Action and Control Buttons */}
          <div className="w-full flex items-center justify-between gap-2 mt-2">
            {isPlayingAudio ? (
              <button
                onClick={handleStopAudio}
                className="flex-1 px-3 py-2 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/60 font-mono-cyber text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(244,63,94,0.3)]"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>STOP PLAYBACK</span>
              </button>
            ) : (
              <button
                onClick={handleReplay}
                disabled={!audioDataUri}
                className="flex-1 px-3 py-2 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 font-mono-cyber text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>REPLAY ORIGINAL VOICE</span>
              </button>
            )}

            <button
              onClick={() => handleStartVoiceSession()}
              disabled={voiceState === 'listening' || voiceState === 'processing'}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold rounded font-orbitron text-xs tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>START VOICE</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Transcript & Signature TTS Audio Cards (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Card 1: Faster-Whisper Speech-To-Text Output */}
          <div className="hud-panel rounded p-4 border border-cyan-500/30">
            <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-cyan-400" />
                <span className="font-orbitron text-xs font-semibold text-cyan-300 tracking-wider">
                  FASTER-WHISPER LIVE TRANSCRIPT (STT)
                </span>
              </div>
              <span className="text-[10px] font-mono-cyber text-slate-500">
                Hardware Ingestion
              </span>
            </div>

            <p className="font-mono-cyber text-xs min-h-[48px] bg-black/60 border border-cyan-900/40 rounded p-3 text-cyan-100 whitespace-pre-wrap leading-relaxed">
              {transcript || (
                <span className="text-slate-500 italic">
                  {voiceState === 'listening' ? 'Listening to hardware microphone via faster-whisper...' : 'Click "Engage" or "Start Voice" to speak.'}
                </span>
              )}
            </p>
          </div>

          {/* Card 2: OpenJarvis Vocal Response Card */}
          <div className="hud-panel rounded p-4 border border-cyan-500/30 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <span className="font-orbitron text-xs font-semibold text-cyan-300 tracking-wider">
                    JARVIS SIGNATURE VOCAL SYNTHESIS (TTS)
                  </span>
                </div>
                
                {response && (
                  <button
                    onClick={() => handleCopyText(response)}
                    className="px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-[10px] font-mono-cyber flex items-center gap-1 transition-all"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'COPIED' : 'COPY'}</span>
                  </button>
                )}
              </div>

              <div className="font-mono-cyber text-xs min-h-[64px] max-h-40 overflow-y-auto bg-black/70 border border-cyan-900/50 rounded p-3 text-cyan-200 whitespace-pre-wrap leading-relaxed">
                {response}
              </div>
            </div>

            {/* Manual TTS Synthesis Sandbox */}
            <div className="mt-3 pt-3 border-t border-cyan-900/60">
              <span className="text-[10px] font-mono-cyber text-slate-400 block mb-1.5">
                DIRECT VOICE ENGINE SYNTHESIZER TESTER:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSynthesize()}
                  placeholder="Type any phrase to test OpenJarvis signature voice..."
                  className="flex-1 bg-black/60 border border-cyan-800 rounded px-3 py-1.5 text-xs font-mono-cyber text-cyan-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleManualSynthesize}
                  disabled={isSynthesizing || !manualText.trim()}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded font-orbitron text-[11px] tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>SYNTHESIZE</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Session Voice Log Table */}
      {logs.length > 0 && (
        <div className="hud-panel rounded p-4 border border-cyan-500/30">
          <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-cyan-400" />
              <span className="font-orbitron text-xs font-semibold text-cyan-300 tracking-wider">
                VOICE INTERACTION AUDIT STREAM
              </span>
            </div>
            <span className="text-[10px] font-mono-cyber text-slate-400">
              {logs.length} SESSIONS RECORDED
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 font-mono-cyber text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded bg-black/60 border border-cyan-950 hover:border-cyan-800/60 transition-all flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px]">[{log.timestamp}]</span>
                    <span className="text-cyan-400 font-semibold">User: "{log.transcript}"</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-slate-400">
                      {log.durationMs}ms
                    </span>
                  </div>
                  <div className="text-slate-300 pl-3 border-l border-cyan-900/60 text-[11px] whitespace-pre-wrap">
                    JARVIS: {log.response}
                  </div>
                </div>

                {log.audioDataUri && (
                  <button
                    onClick={() => {
                      stopAudioPlayback();
                      playAudioStream(log.audioDataUri!);
                    }}
                    className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-[10px] flex items-center gap-1 shrink-0"
                    title="Play Audio"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>PLAY</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
