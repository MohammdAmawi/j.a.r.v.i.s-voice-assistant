/**
 * TEST SUITE 2 — Preload Script & Types Verification
 * Files Under Test: electron/preload.js, src/types.ts
 *
 * Strategy:
 *  - Mock the 'electron' contextBridge and ipcRenderer.
 *  - Load preload.js and assert that exposeInMainWorld is called with
 *    the correct namespace and a complete set of expected methods.
 *  - Verify backward-compat jarvisAPI namespace is also exposed.
 *  - Type-level assertions validate the ElectronAPI interface shape.
 *
 * Coverage:
 *  ✔ electronAPI namespace exposed via contextBridge
 *  ✔ jarvisAPI  backward-compat namespace exposed
 *  ✔ All five electronAPI methods present and callable
 *  ✔ Listener methods (onAiStreamChunk, etc.) return unsubscribe functions
 *  ✔ ElectronAPI type structure matches runtime bridge shape
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ──────────────────────────────────────────────────────────────────────────────
// Track all exposeInMainWorld calls
// ──────────────────────────────────────────────────────────────────────────────
const exposedNamespaces: Record<string, Record<string, unknown>> = {};

const ipcRendererMock = {
  invoke: vi.fn().mockResolvedValue(undefined),
  on: vi.fn().mockReturnValue(undefined),
  removeListener: vi.fn(),
  send: vi.fn(),
};

const electronMock = {
  contextBridge: {
    exposeInMainWorld: vi.fn((namespace: string, api: Record<string, unknown>) => {
      exposedNamespaces[namespace] = api;
    }),
  },
  ipcRenderer: ipcRendererMock,
};

vi.mock('electron', () => electronMock);

// ──────────────────────────────────────────────────────────────────────────────
// Load and execute preload.js safely in ESM
// ──────────────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const preloadPath = path.resolve(__dirname, '../../electron/preload.cjs');
const preloadCode = fs.readFileSync(preloadPath, 'utf8');

const req = createRequire(import.meta.url);
const customRequire = (mod: string) => {
  if (mod === 'electron') return electronMock;
  return req(mod);
};

const runPreload = new Function('require', preloadCode);
runPreload(customRequire);

describe('electron/preload.js — contextBridge namespace exposure', () => {
  it('exposes "electronAPI" namespace', () => {
    expect(exposedNamespaces).toHaveProperty('electronAPI');
  });

  it('exposes "jarvisAPI" namespace for backward compatibility', () => {
    expect(exposedNamespaces).toHaveProperty('jarvisAPI');
  });
});

describe('electronAPI — method completeness', () => {
  const api = () => exposedNamespaces['electronAPI'] as Record<string, Function>;

  it('exposes askJarvis method', () => {
    expect(typeof api().askJarvis).toBe('function');
  });

  it('exposes listenSTT method', () => {
    expect(typeof api().listenSTT).toBe('function');
  });

  it('exposes speakTTS method', () => {
    expect(typeof api().speakTTS).toBe('function');
  });

  it('exposes startVoiceSession method', () => {
    expect(typeof api().startVoiceSession).toBe('function');
  });

  it('exposes playJarvisAudio method', () => {
    expect(typeof api().playJarvisAudio).toBe('function');
  });

  it('askJarvis delegates to ipcRenderer.invoke("ask-jarvis")', async () => {
    ipcRendererMock.invoke.mockResolvedValueOnce('mocked response');
    const result = await api().askJarvis('test query');
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('ask-jarvis', 'test query');
    expect(result).toBe('mocked response');
  });

  it('listenSTT delegates to ipcRenderer.invoke("jarvis:stt")', async () => {
    ipcRendererMock.invoke.mockResolvedValueOnce({ text: 'hello', durationMs: 500, engine: 'faster-whisper' });
    await api().listenSTT({ language: 'en' });
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('jarvis:stt', { language: 'en' });
  });

  it('speakTTS delegates to ipcRenderer.invoke("jarvis:tts")', async () => {
    ipcRendererMock.invoke.mockResolvedValueOnce({ success: true, text: 'hi', audioDataUri: null });
    await api().speakTTS('hello sir', { rate: 1.0 });
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('jarvis:tts', 'hello sir', { rate: 1.0 });
  });

  it('startVoiceSession delegates to ipcRenderer.invoke("jarvis:voice-session")', async () => {
    ipcRendererMock.invoke.mockResolvedValueOnce({ status: 'success' });
    await api().startVoiceSession({ timeout: 30 });
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('jarvis:voice-session', { timeout: 30 });
  });

  it('playJarvisAudio delegates to ipcRenderer.invoke("jarvis:play-audio")', async () => {
    ipcRendererMock.invoke.mockResolvedValueOnce({ success: true });
    await api().playJarvisAudio('data:audio/wav;base64,abc');
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('jarvis:play-audio', 'data:audio/wav;base64,abc');
  });
});

describe('jarvisAPI — backward-compat method completeness', () => {
  const api = () => exposedNamespaces['jarvisAPI'] as Record<string, Function>;

  const legacyMethods = [
    'executeCommand', 'launchApp', 'openExternalUrl', 'takeScreenshot',
    'saveFileToDesktop', 'getSystemMetrics', 'sendAiPrompt',
    'onAiStreamChunk', 'onAudioStatus', 'onAudioTranscript',
    'onWakeWordTriggered', 'onAudioWarning', 'onAiStatus', 'onAiResponse',
    'onGlobalShortcutTriggered', 'minimizeWindow', 'maximizeWindow', 'closeWindow',
  ];

  legacyMethods.forEach((method) => {
    it(`exposes legacy method: ${method}`, () => {
      expect(typeof api()[method]).toBe('function');
    });
  });

  it('onAiStreamChunk returns an unsubscribe function', () => {
    const unsubscribe = api().onAiStreamChunk(() => {});
    expect(typeof unsubscribe).toBe('function');
  });

  it('onAudioStatus returns an unsubscribe function', () => {
    const unsubscribe = api().onAudioStatus(() => {});
    expect(typeof unsubscribe).toBe('function');
  });

  it('unsubscribe function calls ipcRenderer.removeListener', () => {
    const unsubscribe = api().onAudioTranscript(() => {});
    unsubscribe();
    expect(ipcRendererMock.removeListener).toHaveBeenCalledWith('audio:transcript', expect.any(Function));
  });

  it('onWakeWordTriggered listens on correct channel', () => {
    api().onWakeWordTriggered(() => {});
    expect(ipcRendererMock.on).toHaveBeenCalledWith('audio:wake_word', expect.any(Function));
  });

  it('minimizeWindow uses ipcRenderer.send (fire-and-forget)', () => {
    api().minimizeWindow();
    expect(ipcRendererMock.send).toHaveBeenCalledWith('window:minimize');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Type-level shape validation (runtime duck-typing assertions)
// ──────────────────────────────────────────────────────────────────────────────
describe('src/types.ts — ElectronAPI interface shape (runtime duck-typing)', () => {
  it('matches the ElectronAPI interface at runtime', () => {
    const api = exposedNamespaces['electronAPI'];
    // Required by ElectronAPI
    expect(api).toHaveProperty('askJarvis');
    // Optional but present
    expect(api).toHaveProperty('listenSTT');
    expect(api).toHaveProperty('speakTTS');
    expect(api).toHaveProperty('startVoiceSession');
    expect(api).toHaveProperty('playJarvisAudio');
  });
});
