export type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking' | 'executing' | 'error';

export interface CommandLog {
  id: string;
  timestamp: string;
  command: string;
  type: 'voice' | 'text' | 'os' | 'system' | 'file';
  status: 'pending' | 'success' | 'failed';
  output?: string;
  actionTaken?: string;
}

export interface SystemTelemetry {
  cpuUsage: number;
  ramUsage: number;
  networkSpeed: string;
  powerCore: number;
  uptimeSeconds: number;
  isOnline: boolean;
  platform: string;
  nodeVersion: string;
  hostname: string;
}

export interface GeneratedDocument {
  id: string;
  title: string;
  filename: string;
  format: 'txt' | 'md' | 'json' | 'pdf';
  content: string;
  createdAt: string;
  sizeBytes: number;
  path: string;
}

export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  category: 'preference' | 'fact' | 'system' | 'session';
  updatedAt: string;
}

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  coverUrl: string;
  audioUrl?: string;
}

export interface SpotifyState {
  isPlaying: boolean;
  currentTrack: SpotifyTrack;
  volume: number;
  progressSec: number;
  shuffle: boolean;
  repeat: boolean;
}

export interface TestResultItem {
  id: string;
  name: string;
  category: 'unit' | 'integration' | 'security' | 'os';
  status: 'passed' | 'failed' | 'running';
  durationMs: number;
  details: string;
}

export interface JarvisActionResponse {
  speechResponse: string;
  actionType?: 'open_app' | 'take_screenshot' | 'write_file' | 'search_web' | 'control_spotify' | 'store_memory' | 'execute_cmd' | 'none';
  actionPayload?: any;
  logs?: string[];
}

export interface STTResult {
  text: string;
  durationMs?: number;
  engine?: string;
}

export interface TTSResult {
  success: boolean;
  text: string;
  audioDataUri?: string | null;
  engine?: string;
  message?: string;
}

export interface VoiceSessionResult {
  transcript: string;
  response: string;
  audioDataUri?: string | null;
  durationMs: number;
  engine?: string;
  status: 'success' | 'empty_input' | 'error';
}

export interface AudioTelemetry {
  sttEngine: string;
  ttsEngine: string;
  sampleRate: number;
  latencyMs: number;
  isHardwareConnected: boolean;
  status: string;
}

export interface ElectronAPI {
  askJarvis: (text: string) => Promise<string>;
  listenSTT?: (options?: any) => Promise<STTResult>;
  speakTTS?: (text: string, options?: any) => Promise<TTSResult>;
  startVoiceSession?: (options?: any) => Promise<VoiceSessionResult>;
  playJarvisAudio?: (audioDataUri: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    jarvisAPI?: any;
  }
}


