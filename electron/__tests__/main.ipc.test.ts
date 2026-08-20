/**
 * TEST SUITE 1 — Electron Main Process IPC Handlers
 * File Under Test: electron/main.cjs
 *
 * Strategy:
 *  - The main.cjs file registers handlers via ipcMain.handle() on require().
 *  - We mock the 'electron' and 'child_process' modules before requiring the
 *    module so that each ipcMain.handle call is captured in a registry map.
 *  - We then invoke each handler directly and assert on child_process.exec args,
 *    return values, and rejection reasons.
 *
 * Coverage:
 *  ✔ ask-jarvis  — prompt sanitization, CWD, buffer, timeout, empty/invalid prompts
 *  ✔ jarvis:stt  — exec invocation, success/error response shape
 *  ✔ jarvis:tts  — sanitization, temp file lifecycle, base64 encoding fallback
 *  ✔ jarvis:voice-session — sequential pipeline, empty STT early return
 *  ✔ jarvis:play-audio   — always-success bridge
 *  ✔ sanitizePromptForCLI — injection vectors: quotes, backslashes, null/non-string
 */

import { createRequire } from 'node:module';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';

// ──────────────────────────────────────────────────────────────────────────────
// Typings for the captured handler registry
// ──────────────────────────────────────────────────────────────────────────────
type IpcHandler = (event: unknown, ...args: unknown[]) => Promise<unknown>;

// ──────────────────────────────────────────────────────────────────────────────
// Mocked exec factory — returns a jest-compatible stub whose callback we invoke
// ──────────────────────────────────────────────────────────────────────────────
const execMock = vi.fn();

// ipcMain.handle registry — maps channel -> handler function
const ipcHandlers: Record<string, IpcHandler> = {};

// Mock 'electron' module
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: IpcHandler) => {
      ipcHandlers[channel] = handler;
    }),
  },
  app: { getPath: vi.fn(() => os.tmpdir()) },
}));

// Mock 'child_process'
vi.mock('child_process', () => ({
  exec: execMock,
}));

// Mock 'fs'
const fsMock = {
  existsSync: vi.fn(),
  promises: {
    unlink: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn(),
  },
};
vi.mock('fs', () => fsMock);

import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mainPath = path.resolve(__dirname, '../../electron/main.cjs');
const mainCode = fs.readFileSync(mainPath, 'utf8');

const req = createRequire(import.meta.url);

function loadMain() {
  const customRequire = (mod: string) => {
    if (mod === 'electron') {
      return {
        ipcMain: {
          handle: vi.fn((channel: string, handler: IpcHandler) => {
            ipcHandlers[channel] = handler;
          }),
        },
        app: { getPath: vi.fn(() => os.tmpdir()) },
      };
    }
    if (mod === 'child_process') return { exec: execMock };
    if (mod === 'fs') return fsMock;
    if (mod === 'path') return path;
    if (mod === 'os') return os;
    return req(mod);
  };

  const runMain = new Function('require', mainCode);
  runMain(customRequire);
}

const EXPECTED_CWD = 'C:\\Users\\DELL\\AppData\\Local\\OpenJarvis\\src';

describe('electron/main.cjs — IPC Handler Registration', () => {
  beforeEach(() => {
    // Clear handler registry
    Object.keys(ipcHandlers).forEach((k) => delete ipcHandlers[k]);

    // Execute main.cjs with fresh mock handles
    loadMain();
  });

  it('registers all five IPC channels', () => {
    const channels = Object.keys(ipcHandlers);
    expect(channels).toContain('ask-jarvis');
    expect(channels).toContain('jarvis:stt');
    expect(channels).toContain('jarvis:tts');
    expect(channels).toContain('jarvis:voice-session');
    expect(channels).toContain('jarvis:play-audio');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Helper: make exec call its callback with given args
// ──────────────────────────────────────────────────────────────────────────────
function mockExecSuccess(stdout: string, stderr = '') {
  execMock.mockImplementation(
    (_cmd: string, _opts: unknown, callback: (err: Error | null, stdout: string, stderr: string) => void) => {
      setImmediate(() => callback(null, stdout, stderr));
    }
  );
}

function mockExecError(errMsg: string, stderr = '') {
  execMock.mockImplementation(
    (_cmd: string, _opts: unknown, callback: (err: Error | null, stdout: string, stderr: string) => void) => {
      setImmediate(() => callback(new Error(errMsg), '', stderr));
    }
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Load handlers once for assertion tests
// ──────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  Object.keys(ipcHandlers).forEach((k) => delete ipcHandlers[k]);
  vi.resetModules();
  const req = createRequire(import.meta.url);
  try {
    delete req.cache[req.resolve('../../electron/main.cjs')];
  } catch (_) { /* */ }
  req('../../electron/main.cjs');
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION A: ask-jarvis IPC Handler
// ══════════════════════════════════════════════════════════════════════════════
describe('ask-jarvis handler', () => {
  const invoke = (prompt: unknown) => ipcHandlers['ask-jarvis']({}, prompt);

  it('rejects when prompt is empty string', async () => {
    await expect(invoke('')).rejects.toThrow('Prompt text cannot be empty or invalid.');
  });

  it('rejects when prompt is whitespace only', async () => {
    await expect(invoke('   ')).rejects.toThrow('Prompt text cannot be empty or invalid.');
  });

  it('rejects when prompt is null', async () => {
    await expect(invoke(null)).rejects.toThrow('Prompt text cannot be empty or invalid.');
  });

  it('rejects when prompt is a number (non-string)', async () => {
    await expect(invoke(42)).rejects.toThrow('Prompt text cannot be empty or invalid.');
  });

  it('resolves trimmed stdout on success', async () => {
    mockExecSuccess('  Hello from OpenJarvis  ');
    const result = await invoke('What is the time?');
    expect(result).toBe('Hello from OpenJarvis');
  });

  it('returns fallback message when stdout is empty', async () => {
    mockExecSuccess('');
    const result = await invoke('ping');
    expect(result).toBe('No response generated by OpenJarvis.');
  });

  it('rejects with stderr message on exec error', async () => {
    mockExecError('exit 1', 'uv: command not found');
    await expect(invoke('hello')).rejects.toThrow('uv: command not found');
  });

  it('rejects with error.message when stderr is empty', async () => {
    mockExecError('Child process killed', '');
    await expect(invoke('hello')).rejects.toThrow('Child process killed');
  });

  it('executes with correct CWD', async () => {
    mockExecSuccess('ok');
    await invoke('test prompt');
    const [, opts] = execMock.mock.calls[0] as [string, { cwd: string }, unknown];
    expect(opts.cwd).toBe(EXPECTED_CWD);
  });

  it('sets 120-second timeout', async () => {
    mockExecSuccess('ok');
    await invoke('test prompt');
    const [, opts] = execMock.mock.calls[0] as [string, { timeout: number }, unknown];
    expect(opts.timeout).toBe(120000);
  });

  it('sets 10 MB maxBuffer', async () => {
    mockExecSuccess('ok');
    await invoke('test prompt');
    const [, opts] = execMock.mock.calls[0] as [string, { maxBuffer: number }, unknown];
    expect(opts.maxBuffer).toBe(10 * 1024 * 1024);
  });

  it('hides the console window (windowsHide: true)', async () => {
    mockExecSuccess('ok');
    await invoke('test');
    const [, opts] = execMock.mock.calls[0] as [string, { windowsHide: boolean }, unknown];
    expect(opts.windowsHide).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION B: Prompt Sanitization — sanitizePromptForCLI (tested indirectly)
// ══════════════════════════════════════════════════════════════════════════════
describe('ask-jarvis — prompt sanitization against injection', () => {
  const invoke = (prompt: unknown) => ipcHandlers['ask-jarvis']({}, prompt);

  const assertCommand = async (input: string, expectedSubstring: string) => {
    mockExecSuccess('ok');
    await invoke(input);
    const [cmd] = execMock.mock.calls[0] as [string];
    expect(cmd).toContain(expectedSubstring);
  };

  it('escapes double-quotes to prevent shell injection', async () => {
    // Input: He said "hello"   → should become He said \"hello\"
    await assertCommand('He said "hello"', 'He said \\"hello\\"');
  });

  it('escapes backslashes to prevent path injection', async () => {
    // Input: C:\Users → should become C:\\Users inside the command string
    await assertCommand('C:\\Users', 'C:\\\\Users');
  });

  it('handles mixed injection vector: backslash + quote', async () => {
    // Input: path\" injection  → should produce path\\\" injection
    await assertCommand('path\\" injection', 'path\\\\\\"');
  });

  it('wraps sanitized prompt in double-quotes in the CLI command', async () => {
    mockExecSuccess('ok');
    await invoke('list all tasks');
    const [cmd] = execMock.mock.calls[0] as [string];
    expect(cmd).toMatch(/uv run jarvis ask "list all tasks"/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION C: jarvis:stt Handler
// ══════════════════════════════════════════════════════════════════════════════
describe('jarvis:stt handler', () => {
  const invoke = (opts?: unknown) => ipcHandlers['jarvis:stt']({}, opts ?? {});

  it('resolves with text, durationMs, and engine on success', async () => {
    mockExecSuccess('transcribed speech here');
    const result = await invoke() as { text: string; durationMs: number; engine: string };
    expect(result.text).toBe('transcribed speech here');
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.engine).toBe('faster-whisper');
  });

  it('resolves with empty text when stdout is empty', async () => {
    mockExecSuccess('');
    const result = await invoke() as { text: string };
    expect(result.text).toBe('');
  });

  it('executes `uv run jarvis listen` command', async () => {
    mockExecSuccess('ok');
    await invoke();
    const [cmd] = execMock.mock.calls[0] as [string];
    expect(cmd).toBe('uv run jarvis listen');
  });

  it('sets 45-second timeout for STT', async () => {
    mockExecSuccess('ok');
    await invoke();
    const [, opts] = execMock.mock.calls[0] as [string, { timeout: number }];
    expect(opts.timeout).toBe(45000);
  });

  it('rejects with stderr message on microphone error', async () => {
    mockExecError('mic error', 'No audio device found');
    await expect(invoke()).rejects.toThrow('No audio device found');
  });

  it('rejects with error.message when stderr is empty', async () => {
    mockExecError('Timeout exceeded', '');
    await expect(invoke()).rejects.toThrow('Timeout exceeded');
  });

  it('executes in correct OpenJarvis CWD', async () => {
    mockExecSuccess('ok');
    await invoke();
    const [, opts] = execMock.mock.calls[0] as [string, { cwd: string }];
    expect(opts.cwd).toBe(EXPECTED_CWD);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION D: jarvis:tts Handler
// ══════════════════════════════════════════════════════════════════════════════
describe('jarvis:tts handler', () => {
  const invoke = (text: unknown) => ipcHandlers['jarvis:tts']({}, text);

  it('rejects when text is empty', async () => {
    await expect(invoke('')).rejects.toThrow('Text for speech synthesis cannot be empty.');
  });

  it('rejects when text is whitespace only', async () => {
    await expect(invoke('   ')).rejects.toThrow('Text for speech synthesis cannot be empty.');
  });

  it('rejects when text is null', async () => {
    await expect(invoke(null)).rejects.toThrow('Text for speech synthesis cannot be empty.');
  });

  it('resolves with audioDataUri when temp file exists', async () => {
    const fakeBuffer = Buffer.from('fake-audio-data');
    fsMock.existsSync.mockReturnValue(true);
    fsMock.promises.readFile.mockResolvedValue(fakeBuffer);
    mockExecSuccess('');

    const result = await invoke('Hello Sir') as { success: boolean; audioDataUri: string; engine: string };
    expect(result.success).toBe(true);
    expect(result.audioDataUri).toMatch(/^data:audio\/wav;base64,/);
    expect(result.engine).toBe('OpenJarvis Signature Voice');
    // Temp file should be cleaned up
    expect(fsMock.promises.unlink).toHaveBeenCalled();
  });

  it('resolves with null audioDataUri when temp file does not exist', async () => {
    fsMock.existsSync.mockReturnValue(false);
    mockExecSuccess('Synthesized');

    const result = await invoke('Good morning') as { success: boolean; audioDataUri: null };
    expect(result.success).toBe(true);
    expect(result.audioDataUri).toBeNull();
  });

  it('resolves gracefully when exec fails (fallback to system speaker)', async () => {
    mockExecError('TTS engine missing');
    const result = await invoke('Test phrase') as { success: boolean; audioDataUri: null };
    expect(result.success).toBe(true);
    expect(result.audioDataUri).toBeNull();
  });

  it('sets 60-second timeout for TTS', async () => {
    fsMock.existsSync.mockReturnValue(false);
    mockExecSuccess('');
    await invoke('test');
    const [, opts] = execMock.mock.calls[0] as [string, { timeout: number }];
    expect(opts.timeout).toBe(60000);
  });

  it('passes sanitized text in TTS command', async () => {
    fsMock.existsSync.mockReturnValue(false);
    mockExecSuccess('');
    await invoke('Say "hello"');
    const [cmd] = execMock.mock.calls[0] as [string];
    expect(cmd).toContain('Say \\"hello\\"');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION E: jarvis:voice-session Handler
// ══════════════════════════════════════════════════════════════════════════════
describe('jarvis:voice-session handler', () => {
  const invoke = () => ipcHandlers['jarvis:voice-session']({});

  it('returns empty_input status when STT produces no speech', async () => {
    // First exec call (listen) returns empty
    execMock.mockImplementationOnce((_c: string, _o: unknown, cb: Function) => setImmediate(() => cb(null, '', '')));

    const result = await invoke() as { status: string; transcript: string };
    expect(result.status).toBe('empty_input');
    expect(result.transcript).toBe('');
  });

  it('runs full pipeline and returns success status with response', async () => {
    fsMock.existsSync.mockReturnValue(false);

    // exec call 1: STT (listen)
    execMock.mockImplementationOnce((_c: string, _o: unknown, cb: Function) =>
      setImmediate(() => cb(null, 'Open the pod bay doors', ''))
    );
    // exec call 2: ask
    execMock.mockImplementationOnce((_c: string, _o: unknown, cb: Function) =>
      setImmediate(() => cb(null, "I'm afraid I can't do that.", ''))
    );
    // exec call 3: tts
    execMock.mockImplementationOnce((_c: string, _o: unknown, cb: Function) =>
      setImmediate(() => cb(null, '', ''))
    );

    const result = await invoke() as {
      status: string;
      transcript: string;
      response: string;
      durationMs: number;
      engine: string;
    };
    expect(result.status).toBe('success');
    expect(result.transcript).toBe('Open the pod bay doors');
    expect(result.response).toBe("I'm afraid I can't do that.");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.engine).toContain('faster-whisper');
  });

  it('throws when STT exec fails', async () => {
    execMock.mockImplementationOnce((_c: string, _o: unknown, cb: Function) =>
      setImmediate(() => cb(new Error('mic device not found'), '', 'mic device not found'))
    );
    await expect(invoke()).rejects.toThrow('mic device not found');
  });

  it('throws when query exec fails', async () => {
    execMock.mockImplementationOnce((_c: string, _o: unknown, cb: Function) =>
      setImmediate(() => cb(null, 'hello jarvis', ''))
    );
    execMock.mockImplementationOnce((_c: string, _o: unknown, cb: Function) =>
      setImmediate(() => cb(new Error('OpenJarvis not installed'), '', 'OpenJarvis not installed'))
    );
    await expect(invoke()).rejects.toThrow('OpenJarvis not installed');
  });

  it('includes audioDataUri when TTS generates a WAV file', async () => {
    const fakeBuffer = Buffer.from('wav-data');
    fsMock.existsSync.mockReturnValue(true);
    fsMock.promises.readFile.mockResolvedValue(fakeBuffer);

    execMock.mockImplementationOnce((_c: string, _o: unknown, cb: Function) =>
      setImmediate(() => cb(null, 'hello', ''))
    );
    execMock.mockImplementationOnce((_c: string, _o: unknown, cb: Function) =>
      setImmediate(() => cb(null, 'response', ''))
    );
    execMock.mockImplementationOnce((_c: string, _o: unknown, cb: Function) =>
      setImmediate(() => cb(null, '', ''))
    );

    const result = await invoke() as { audioDataUri: string | null };
    expect(result.audioDataUri).toMatch(/^data:audio\/wav;base64,/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION F: jarvis:play-audio Handler
// ══════════════════════════════════════════════════════════════════════════════
describe('jarvis:play-audio handler', () => {
  const invoke = (uri: string) => ipcHandlers['jarvis:play-audio']({}, uri);

  it('always returns success: true', async () => {
    const result = await invoke('data:audio/wav;base64,abc==') as { success: boolean };
    expect(result.success).toBe(true);
  });

  it('handles undefined uri gracefully', async () => {
    const result = await invoke(undefined as unknown as string) as { success: boolean };
    expect(result.success).toBe(true);
  });
});
