/**
 * J.A.R.V.I.S — Global Test Setup
 *
 * Sets up all global mocks needed before any test file runs:
 * - window.HTMLElement.prototype.scrollIntoView & Element.prototype.scrollIntoView
 * - navigator.clipboard (with persistent vi.fn() spies for writeText/readText)
 * - window.Audio & global.Audio class stub (with play, pause, onended, onerror, currentTime)
 * - window.electronAPI (full typed mock of ElectronAPI)
 * - window.jarvisAPI  (backward-compat legacy mock)
 * - soundFx module mock (prevents audio calls in tests)
 */

import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';

// ──────────────────────────────────────────────────────────────────────────────
// 1. DOM API Polyfills (jsdom missing methods)
// ──────────────────────────────────────────────────────────────────────────────
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = vi.fn();
}
if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.scrollIntoView = vi.fn();
}
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. Mock: window.Audio / global.Audio class
// ──────────────────────────────────────────────────────────────────────────────
export class MockAudio {
  src: string;
  onended: ((this: GlobalEventHandlers, ev: Event) => any) | null = null;
  onerror: ((this: GlobalEventHandlers, ev: Event | string) => any) | null = null;
  currentTime = 0;
  paused = true;
  duration = 0;
  volume = 1;
  muted = false;

  constructor(src?: string) {
    this.src = src || '';
  }

  play = vi.fn().mockImplementation(() => {
    this.paused = false;
    return Promise.resolve();
  });

  pause = vi.fn().mockImplementation(() => {
    this.paused = true;
  });

  load = vi.fn();

  addEventListener = vi.fn((event: string, handler: any) => {
    if (event === 'ended') this.onended = handler;
    if (event === 'error') this.onerror = handler;
  });

  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
}

// Assign to global and window scopes
global.Audio = MockAudio as any;
if (typeof window !== 'undefined') {
  window.Audio = MockAudio as any;
}
globalThis.Audio = MockAudio as any;

// ──────────────────────────────────────────────────────────────────────────────
// 3. Mock: navigator.clipboard
// ──────────────────────────────────────────────────────────────────────────────
export const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
  readText: vi.fn().mockResolvedValue(''),
};

Object.defineProperty(navigator, 'clipboard', {
  get() {
    return mockClipboard;
  },
  set(newVal) {
    if (newVal && typeof newVal.writeText === 'function' && !vi.isMockFunction(newVal.writeText)) {
      mockClipboard.writeText = vi.fn().mockImplementation((...args) => newVal.writeText(...args));
    }
    if (newVal && typeof newVal.readText === 'function' && !vi.isMockFunction(newVal.readText)) {
      mockClipboard.readText = vi.fn().mockImplementation((...args) => newVal.readText(...args));
    }
  },
  configurable: true,
  enumerable: true,
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. Mock: window.electronAPI
// ──────────────────────────────────────────────────────────────────────────────
export const mockElectronAPI = {
  askJarvis: vi.fn(),
  listenSTT: vi.fn(),
  speakTTS: vi.fn(),
  startVoiceSession: vi.fn(),
  playJarvisAudio: vi.fn(),
};

// ──────────────────────────────────────────────────────────────────────────────
// 5. Mock: window.jarvisAPI (backward-compat legacy bridge)
// ──────────────────────────────────────────────────────────────────────────────
export const mockJarvisAPI = {
  executeCommand: vi.fn(),
  launchApp: vi.fn(),
  openExternalUrl: vi.fn(),
  takeScreenshot: vi.fn(),
  saveFileToDesktop: vi.fn(),
  getSystemMetrics: vi.fn(),
  sendAiPrompt: vi.fn(),
  onAiStreamChunk: vi.fn().mockReturnValue(vi.fn()),
  onAudioStatus: vi.fn().mockReturnValue(vi.fn()),
  onAudioTranscript: vi.fn().mockReturnValue(vi.fn()),
  onWakeWordTriggered: vi.fn().mockReturnValue(vi.fn()),
  onAudioWarning: vi.fn().mockReturnValue(vi.fn()),
  onAiStatus: vi.fn().mockReturnValue(vi.fn()),
  onAiResponse: vi.fn().mockReturnValue(vi.fn()),
  onGlobalShortcutTriggered: vi.fn().mockReturnValue(vi.fn()),
  minimizeWindow: vi.fn(),
  maximizeWindow: vi.fn(),
  closeWindow: vi.fn(),
};

// ──────────────────────────────────────────────────────────────────────────────
// 6. Mock: src/audio/soundFx — prevents side-effects in all component tests
// ──────────────────────────────────────────────────────────────────────────────
vi.mock('../audio/soundFx', () => ({
  soundFx: {
    playScanChirp: vi.fn(),
    playConfirmSound: vi.fn(),
    playErrorAlert: vi.fn(),
    playHudClick: vi.fn(),
  },
}));

// ──────────────────────────────────────────────────────────────────────────────
// Lifecycle Hooks
// ──────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  // Ensure DOM scroll stubs
  if (typeof HTMLElement !== 'undefined') {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  }
  if (typeof Element !== 'undefined') {
    Element.prototype.scrollIntoView = vi.fn();
  }

  // Ensure Audio stub
  global.Audio = MockAudio as any;
  if (typeof window !== 'undefined') {
    window.Audio = MockAudio as any;
  }
  globalThis.Audio = MockAudio as any;

  // Reset clipboard spies
  mockClipboard.writeText.mockReset().mockResolvedValue(undefined);
  mockClipboard.readText.mockReset().mockResolvedValue('');

  // Re-attach electron APIs
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'jarvisAPI', {
      value: mockJarvisAPI,
      writable: true,
      configurable: true,
    });
  }

  // Clear all mock call histories
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
