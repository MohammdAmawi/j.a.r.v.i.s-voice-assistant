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

export interface ElectronAPI {
  askJarvis: (text: string) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    jarvisAPI?: any;
  }
}

