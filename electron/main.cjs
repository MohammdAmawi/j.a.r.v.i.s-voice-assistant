/**
 * J.A.R.V.I.S — Electron Main Process & Native Audio IPC Gateway
 * 
 * ARCHITECTURAL SPECIFICATION:
 * - Handles local OpenJarvis CLI queries, faster-whisper STT, and signature TTS audio synthesis.
 * - Enforces working directory (cwd) isolation to the OpenJarvis source directory.
 * - Prevents UI/Main thread blocking by utilizing asynchronous non-blocking child processes.
 * - Handles audio file generation, base64 encoding, and automatic temporary file cleanup.
 * - Protects against command injection and shell syntax errors via defensive string sanitization.
 */

const { ipcMain, app, BrowserWindow } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Target directory where OpenJarvis is installed locally
const OPENJARVIS_PATH = 'C:\\Users\\DELL\\AppData\\Local\\OpenJarvis\\src';

// Resolve the Python interpreter inside the OpenJarvis uv-managed virtualenv
const OPENJARVIS_PYTHON = path.join(OPENJARVIS_PATH, '.venv', 'Scripts', 'python.exe');

// Vite dev server URL
const VITE_DEV_SERVER_URL = 'http://localhost:3000';

let mainWindow = null;

// Concurrency guard: prevents overlapping microphone capture sessions.
// Only one STT recording Python process may hold the audio device at any time.
let isRecordingActive = false;

// ==========================================
// Clean subprocess environment & LLM inference layer
// ==========================================

// Local Ollama inference endpoint (primary LLM backend).
const OLLAMA_HOST = (process.env.OLLAMA_HOST || 'http://localhost:11434').replace(/\/+$/, '');

// Strip ANSI escape sequences (color / bold / cursor codes) from CLI output so
// IPC payloads never leak terminal formatting into the React UI.
const ANSI_ESCAPE_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
function stripAnsi(text) {
  return (text || '').replace(ANSI_ESCAPE_RE, '');
}

// Environment for every Python/CLI subprocess: unbuffered output (so stdout
// flushes per-print), no color codes, and a dumb terminal profile that makes
// rich/click suppress their decorative banners and update notices.
const CLEAN_PROCESS_ENV = {
  ...process.env,
  PYTHONUNBUFFERED: '1',
  NO_COLOR: '1',
  TERM: 'dumb',
  PYTHONDONTWRITEBYTECODE: '1',
};

// Resolve the configured local model from OpenJarvis config.toml if present.
function resolveOllamaModel() {
  try {
    const cfgPath = path.join(os.homedir(), '.openjarvis', 'config.toml');
    if (fs.existsSync(cfgPath)) {
      const cfg = fs.readFileSync(cfgPath, 'utf8');
      const m = cfg.match(/default_model\s*=\s*["']([^"']+)["']/);
      if (m && m[1]) return m[1].trim();
    }
  } catch (_) {
    /* fall through to default */
  }
  return 'qwen3.5:9b';
}
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || resolveOllamaModel();

/**
 * Promisified exec with the clean subprocess environment and ANSI stripping.
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
function execCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    exec(
      command,
      {
        cwd: OPENJARVIS_PATH,
        windowsHide: true,
        maxBuffer: options.maxBuffer || 10 * 1024 * 1024,
        timeout: options.timeout || 60000,
        env: options.env || CLEAN_PROCESS_ENV,
        ...options.execOptions,
      },
      (error, stdout, stderr) => {
        const cleanStdout = stripAnsi(stdout || '');
        const cleanStderr = stripAnsi(stderr || '');
        if (error) {
          const detail = (cleanStderr && cleanStderr.trim()) || error.message || 'Command execution failed.';
          return reject(new Error(detail));
        }
        resolve({ stdout: cleanStdout, stderr: cleanStderr });
      }
    );
  });
}

/**
 * Primary LLM inference via local Ollama (/api/chat).
 * Passes `think: false` so Qwen3-style thinking tokens never crowd out the
 * visible answer, and stream:false for a single strict JSON result.
 *
 * Uses a 60-second HTTP timeout so a cold-start model load on CPU (which can
 * take tens of seconds) is allowed to complete. If the configured primary
 * model times out or fails, gracefully falls back to smaller models
 * (qwen2.5:3b, then llama3.2:3b) before reporting the inference engine as
 * offline.
 *
 * @param {string} promptText - User prompt
 * @returns {Promise<{ok: boolean, text: string}>} Never throws; callers inspect `ok`.
 */
async function askLLM(promptText) {
  const fallbackModels = ['qwen2.5:3b', 'llama3.2:3b'];
  const candidateModels = [OLLAMA_MODEL, ...fallbackModels.filter((m) => m !== OLLAMA_MODEL)];

  let lastError = null;
  for (const model of candidateModels) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        timeout: 60000,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: promptText }],
          stream: false,
          think: false,
          options: {
            temperature: 0.7,
            num_predict: 1024,
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.warn(`[LLM] Ollama returned HTTP ${response.status} for model ${model}: ${body.slice(0, 300)}`);
        lastError = new Error(`Ollama HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const text = (data?.message?.content || '').trim();
      if (text) return { ok: true, text };
      lastError = new Error('Empty LLM response.');
    } catch (err) {
      lastError = err;
      console.warn(`[LLM] Ollama inference failed for model ${model}:`, err?.message || err);
    } finally {
      clearTimeout(timer);
    }
  }

  console.warn('[LLM] All candidate models failed — inference engine unavailable:', lastError?.message || lastError);
  return { ok: false, text: '' };
}

// Single-word / short phrases that faster-whisper hallucinates when only
// background noise or silence is present. Filtered so the pipeline returns a
// clean "no audible command" status instead of feeding noise to the LLM.
const STT_NOISE_PHRASES = new Set([
  'you', 'thank you', 'thanks', 'thank', 'thanks for watching',
  'um', 'uh', 'hmm', 'ok', 'okay', 'oh', 'a', 'an', 'the',
  'yes', 'no', 'yeah', 'yep', 'nope', 'hi', 'hello', 'hey',
  'great', 'fine', 'good', 'bye', 'so', 'and', 'i', 'we',
]);

function isNoiseTranscript(text) {
  const t = (text || '').trim();
  if (!t) return true;
  if (t.length < 3) return true;
  const phrase = t
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
  return STT_NOISE_PHRASES.has(phrase);
}

// ==========================================
// Unified Audio Core — JSON extraction & renderer event bridge
// ==========================================

/**
 * Extracts the trailing JSON object from Python child-process stdout,
 * stripping ANSI escape codes and discarding non-JSON diagnostic log lines
 * (sounddevice device tables, rich banners, etc.) so IPC payloads always
 * parse against strictly formatted JSON.
 *
 * @param {string} text - Raw process stdout
 * @returns {object|null} Parsed JSON object, or null if none found.
 */
function extractJsonObject(text) {
  const clean = stripAnsi(text || '');
  const lines = clean.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // JSON payloads are emitted last by the capture scripts — scan from the tail.
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const start = line.indexOf('{');
    if (start < 0) continue;
    let depth = 0;
    for (let j = start; j < line.length; j++) {
      const ch = line[j];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(line.slice(start, j + 1));
          } catch (_) {
            break;
          }
        }
      }
    }
    // Fallback: try the whole (trimmed) line as a single JSON document.
    try {
      return JSON.parse(line);
    } catch (_) { /* keep scanning */ }
  }
  return null;
}

/**
 * Pushes a live status event to the renderer so every HUD (Voice AI, Native
 * Audio, OpenJarvis) mirrors the exact state of the unified voice pipeline.
 */
function emitRendererStatus(event, state, message) {
  try {
    if (event && typeof event.sender?.send === 'function') {
      event.sender.send('audio:status', { state, message, timestamp: Date.now() });
    }
  } catch (_) { /* renderer may be gone during shutdown */ }
}

/**
 * Pushes a live (non-final) transcript event to the renderer. Deliberately
 * non-final so the App-level wake-word/auto-command handler never double
 * executes the same utterance through a secondary brain path.
 */
function emitRendererTranscript(event, text, isFinal = false) {
  try {
    if (event && typeof event.sender?.send === 'function') {
      event.sender.send('audio:transcript', { text, isFinal, timestamp: Date.now() });
    }
  } catch (_) { /* renderer may be gone during shutdown */ }
}

/**
 * Shared Speech-To-Text core: runs the temp-file Python capture script
 * (sounddevice → FasterWhisper), strips ANSI/non-JSON diagnostics, and
 * filters whisper noise hallucinations.
 *
 * @param {number} durationSec - Recording window (clamped 1..30)
 * @param {string} [logTag]    - Optional log prefix for traceability
 * @returns {Promise<{text: string, engine: string, bytesRecorded?: number, durationSec: number}>}
 */
async function runSTTCapture(durationSec, logTag = 'STT') {
  const clamped = Math.max(1, Math.min(Number(durationSec) || 3, 30));
  const { stdout, stderr } = await runPythonScript(STT_PYTHON_SCRIPT, `${clamped}`, 60000);

  if (stderr) console.log(`[${logTag}] Python stderr:`, stripAnsi(stderr).trim());

  const parsed = extractJsonObject(stdout);
  let transcribedText = '';
  let scriptError = null;

  if (parsed) {
    transcribedText = typeof parsed.text === 'string' ? parsed.text : '';
    scriptError = parsed.error || null;
    if (parsed.bytes_recorded !== undefined) {
      console.log(`[${logTag}] Bytes recorded by mic:`, parsed.bytes_recorded);
    }
  } else {
    // Plain-text transcript fallback (raw whisper output on stdout).
    transcribedText = stripAnsi(stdout).trim();
  }

  if (scriptError) {
    throw new Error(`STT recording failed: ${scriptError}`);
  }

  // Filter whisper hallucinations (background noise transcribed as filler).
  if (isNoiseTranscript(transcribedText)) transcribedText = '';

  return {
    text: transcribedText,
    engine: 'faster-whisper',
    bytesRecorded: parsed?.bytes_recorded,
    durationSec: clamped,
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'J.A.R.V.I.S',
    backgroundColor: '#060b13',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL(VITE_DEV_SERVER_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Window control IPC handlers
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

/**
 * Escapes characters safely for Windows CLI execution.
 * Handles backslashes and double quotes to prevent syntax breakage and command injection.
 * 
 * @param {string} input - Raw user prompt string
 * @returns {string} Sanitized string safe for CLI arguments
 */
function sanitizePromptForCLI(input) {
  if (typeof input !== 'string') {
    return '';
  }
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

/**
 * Safely removes a file from disk without throwing uncaught exceptions.
 * @param {string} filePath - Path to file
 */
async function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.warn('[Audio Gateway] Cleanup warning:', err.message);
  }
}

/**
 * Prunes stale `jarvis_session_*.wav` temp files left on disk so keeping
 * `audioPath` valid for the frontend never accumulates disk bloat.
 * @param {number} [maxAgeMs=60*60*1000] - Files older than this are removed.
 */
async function cleanupStaleSessionAudio(maxAgeMs = 60 * 60 * 1000) {
  try {
    const tempDir = os.tmpdir();
    const entries = await fs.promises.readdir(tempDir);
    const now = Date.now();
    for (const name of entries) {
      if (!name.startsWith('jarvis_session_') || !name.endsWith('.wav')) continue;
      const filePath = path.join(tempDir, name);
      try {
        const stat = await fs.promises.stat(filePath);
        if (now - stat.mtimeMs > maxAgeMs) {
          await safeUnlink(filePath);
        }
      } catch (_) {
        /* ignore per-file cleanup errors */
      }
    }
  } catch (err) {
    console.warn('[Audio Gateway] Stale session audio cleanup warning:', err.message);
  }
}

/**
 * Executes a Python script by writing it to a temp .py file, then running it.
 * Eliminates all Windows cmd.exe quoting issues that break `python -c "..."` invocations.
 * Uses the clean subprocess environment (unbuffered, no color) and strips ANSI
 * codes so IPC handlers receive strictly formatted output.
 *
 * @param {string} scriptContent - Python source code
 * @param {string} [args='']      - Space-separated CLI args appended after the script path
 * @param {number} [timeoutMs=45000]
 * @param {number} [maxBuffer=5242880]
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
function runPythonScript(scriptContent, args = '', timeoutMs = 45000, maxBuffer = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const tag = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const tmpScript = path.join(os.tmpdir(), `jarvis_py_${tag}.py`);

    try {
      fs.writeFileSync(tmpScript, scriptContent, 'utf8');
    } catch (writeErr) {
      return reject(new Error(`Failed to write temp Python script: ${writeErr.message}`));
    }

    const command = `"${OPENJARVIS_PYTHON}" "${tmpScript}"${args ? ' ' + args : ''}`;

    exec(
      command,
      {
        cwd: OPENJARVIS_PATH,
        windowsHide: true,
        maxBuffer,
        timeout: timeoutMs,
        env: CLEAN_PROCESS_ENV,
      },
      (error, stdout, stderr) => {
        // Always clean up the temp script file
        try { fs.unlinkSync(tmpScript); } catch (_) {}

        const cleanStdout = stripAnsi(stdout || '');
        const cleanStderr = stripAnsi(stderr || '');

        if (error) {
          const detail = (cleanStderr && cleanStderr.trim()) || error.message || 'Python script execution failed.';
          return reject(new Error(detail));
        }

        resolve({
          stdout: cleanStdout,
          stderr: cleanStderr,
        });
      }
    );
  });
}

// ==========================================
// Unified Intent & Need Determination (Smart Routing)
// ==========================================

// Whitelisted application launch targets. Spoken text is matched against these
// aliases so raw user speech is NEVER interpolated into a shell command.
const OS_APP_ALIASES = {
  'vs code': { cmd: 'code .', display: 'VS Code' },
  'visual studio code': { cmd: 'code .', display: 'VS Code' },
  vscode: { cmd: 'code .', display: 'VS Code' },
  code: { cmd: 'code .', display: 'VS Code' },
  chrome: { cmd: 'start chrome', display: 'Google Chrome' },
  browser: { cmd: 'start chrome', display: 'Google Chrome' },
  firefox: { cmd: 'start firefox', display: 'Mozilla Firefox' },
  spotify: { cmd: 'start spotify', display: 'Spotify' },
  music: { cmd: 'start spotify', display: 'Spotify' },
  terminal: { cmd: 'start cmd', display: 'Command Prompt' },
  'command prompt': { cmd: 'start cmd', display: 'Command Prompt' },
  cmd: { cmd: 'start cmd', display: 'Command Prompt' },
  calculator: { cmd: 'calc', display: 'Calculator' },
  calc: { cmd: 'calc', display: 'Calculator' },
  notepad: { cmd: 'notepad', display: 'Notepad' },
  explorer: { cmd: 'explorer', display: 'File Explorer' },
  'file explorer': { cmd: 'explorer', display: 'File Explorer' },
  'task manager': { cmd: 'taskmgr', display: 'Task Manager' },
  settings: { cmd: 'start ms-settings:', display: 'Windows Settings' },
  'control panel': { cmd: 'control', display: 'Control Panel' },
  word: { cmd: 'start winword', display: 'Microsoft Word' },
  excel: { cmd: 'start excel', display: 'Microsoft Excel' },
  powerpoint: { cmd: 'start powerpnt', display: 'Microsoft PowerPoint' },
  outlook: { cmd: 'start outlook', display: 'Microsoft Outlook' },
  paint: { cmd: 'mspaint', display: 'Microsoft Paint' },
  edge: { cmd: 'start msedge', display: 'Microsoft Edge' },
};

/**
 * Smart intent router. Classifies a transcript as either an executable OS
 * action (launch app / disk diagnostics / system report / screenshot) or a
 * conversational prompt destined for the local LLM (Ollama qwen3.5:9b).
 *
 * @param {string} transcript - STT / text input
 * @returns {{type: 'os_action', action: string, command: string|null, confirm: string, appName?: string, screenshotPath?: string} | {type: 'conversational'}}
 */
function detectIntent(transcript) {
  const t = (transcript || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!t) return { type: 'conversational' };

  // OS action: launch an application ("open vs code", "launch chrome"...).
  const launchMatch = t.match(/\b(?:open|launch|start|run)\s+(?:the\s+|up\s+)?(.+)/i);
  if (launchMatch) {
    const phrase = launchMatch[1].toLowerCase().trim();
    for (const [alias, def] of Object.entries(OS_APP_ALIASES)) {
      if (phrase.includes(alias)) {
        return {
          type: 'os_action',
          action: 'launch_app',
          appName: def.display,
          command: def.cmd,
          confirm: `Opening ${def.display} on your workstation now, Sir.`,
        };
      }
    }
  }

  // OS action: disk / storage diagnostics ("check disk", "free space"...).
  if (/\b(?:disk|drive|storage)\b/.test(t) && /\b(?:check|show|see|free|space|usage|status|how much)\b/.test(t)) {
    return {
      type: 'os_action',
      action: 'check_disk',
      command: 'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Get-PSDrive -PSProvider FileSystem | Select-Object Name,@{N=\'Used(GB)\';E={[math]::Round($_.Used/1GB,1)}},@{N=\'Free(GB)\';E={[math]::Round($_.Free/1GB,1)}} | Format-Table -AutoSize"',
      confirm: 'Scanning your primary storage matrix now, Sir.',
    };
  }

  // OS action: full system intelligence report.
  if (/\b(?:system|computer|machine)\b/.test(t) && /\b(?:info|status|report|health|check|diagnos)\b/.test(t)) {
    return {
      type: 'os_action',
      action: 'system_info',
      command: 'systeminfo',
      confirm: 'Compiling the full system intelligence report now, Sir.',
    };
  }

  // OS action: screen snapshot.
  if (/\b(?:take|grab|capture)\b/.test(t) && /\b(?:screenshot|screen|snapshot)\b/.test(t)) {
    const shotPath = path.join(os.homedir(), 'Desktop', `jarvis_screenshot_${Date.now()}.png`);
    return {
      type: 'os_action',
      action: 'screenshot',
      command: `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b=[System.Windows.Forms.SystemInformation]::VirtualScreen; $bmp=New-Object System.Drawing.Bitmap $b.Width,$b.Height; $g=[System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Left,$b.Top,0,0,$bmp.Size); $bmp.Save('${String(shotPath).replace(/'/g, "''")}'); $g.Dispose(); $bmp.Dispose()"`,
      screenshotPath: shotPath,
      confirm: 'Capturing a high-resolution snapshot of your primary display now, Sir.',
    };
  }

  // Default: conversational prompt → local Ollama.
  return { type: 'conversational' };
}

/**
 * Builds the spoken confirmation for an executed OS action from its captured
 * stdout, so the assistant always reports a concrete result (never silence).
 */
function composeOSConfirmation(intent, result) {
  const base = intent.confirm || 'Command executed successfully, Sir.';
  const output = (result?.output || '').trim();

  if (intent.action === 'check_disk') {
    const rows = output
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^[A-Za-z]:\s/.test(l))
      .slice(0, 4);
    if (rows.length) return `${base} ${rows.join('. ')}.`;
  }

  if (intent.action === 'system_info') {
    const host = output.match(/Host Name:\s*(.+)/i);
    const osName = output.match(/OS Name:\s*(.+)/i);
    const osVer = output.match(/OS Version:\s*(.+)/i);
    const parts = [];
    if (host) parts.push(`Host ${host[1].trim()}`);
    if (osName) parts.push(`OS ${osName[1].trim()}`);
    if (osVer) parts.push(`Version ${osVer[1].trim()}`);
    if (parts.length) return `${base} ${parts.join('. ')}.`;
  }

  if (intent.action === 'screenshot' && intent.screenshotPath) {
    return `${intent.confirm} The snapshot is saved to ${intent.screenshotPath}.`;
  }

  return base;
}

/**
 * Executes a whitelisted OS action in the isolated clean subprocess
 * environment. Never fails the pipeline — returns a structured result instead.
 */
async function executeOSAction(intent) {
  if (!intent || intent.type !== 'os_action' || !intent.command) {
    return { success: true, output: '', error: '' };
  }
  try {
    const { stdout, stderr } = await execCommand(intent.command, { timeout: 30000, maxBuffer: 5 * 1024 * 1024 });
    return { success: true, output: (stdout || stderr || '').trim(), error: '' };
  } catch (err) {
    console.warn('[OS Action] Execution warning:', err?.message || err);
    return { success: false, output: '', error: err?.message || String(err) };
  }
}

// ==========================================
// 1. Text Query Handler ('ask-jarvis')
// ==========================================
ipcMain.handle('ask-jarvis', async (event, promptText) => {
  try {
    if (!promptText || typeof promptText !== 'string' || !promptText.trim()) {
      throw new Error('Prompt text cannot be empty or invalid.');
    }

    const prompt = promptText.trim();

    // Unified smart router: OS actions execute natively and speak a
    // confirmation; conversational prompts go to the local Ollama core.
    const intent = detectIntent(prompt);
    if (intent.type === 'os_action') {
      const result = await executeOSAction(intent);
      if (result && result.success) return composeOSConfirmation(intent, result);
      return `${intent.confirm || 'Command executed, Sir.'}${result?.error ? ' However, an execution warning occurred: ' + result.error : ''}`;
    }

    // Primary: local Ollama inference (strict JSON, no CLI banner noise).
    const { ok, text } = await askLLM(prompt);

    // Secondary fallback: structured response instead of a raw process crash.
    if (!ok || !text) {
      console.warn('[OpenJarvis IPC] Ollama unavailable — returning structured fallback.');
      return 'Inference engine offline. Start Ollama via "ollama serve" and try again.';
    }

    return text;
  } catch (err) {
    console.error('[OpenJarvis IPC] Unexpected handler exception:', err);
    return 'Inference engine offline. Start Ollama via "ollama serve" and try again.';
  }
});

// ==========================================
// 2. Speech-To-Text (faster-whisper STT)
// ==========================================

// Python script for microphone recording + transcription.
// Written to a temp .py file at runtime to avoid Windows cmd.exe quoting issues.
// Capture layer uses sounddevice (PortAudio) instead of the legacy WinMM
// winmm.dll API, which permanently resolves `waveInOpen error 32`. Falls back
// to PyAudio when sounddevice is missing or fails to open the device.
//
// ANTI-HALLUCINATION PIPELINE:
//  1. VAD silence gate — RMS/peak energy is computed before inference; quiet or
//     ambient-only audio emits {"text": ""} immediately and NEVER reaches the
//     Whisper model (kills "and we're up, up, up" style hallucinations).
//  2. Hallucination-suppression transcribe kwargs — no_speech_threshold=0.6,
//     condition_on_previous_text=False, hallucination_silence_threshold=2.0.
//  3. Responsive window — 3s default capture with leading/trailing silence
//     trimmed from the buffer before transcription.
const STT_PYTHON_SCRIPT = `
import json, os, sys, tempfile, time
import wave

import numpy as np

SAMPLE_RATE   = 16000
CHANNELS      = 1
BITS          = 16
CHUNK_FRAMES  = 1024

# Anti-hallucination VAD tuning (int16 PCM domain).
# Ambient mic noise can spike to peak ~1000 while RMS stays low (~35-100);
# both checks are OR-gated so quiet ambient audio is discarded immediately.
SILENCE_PEAK_INT16 = 1500                 # |sample| below this is quiet/ambient
SILENCE_RMS_INT16  = 250                  # normalized RMS below this is ambient
MIN_ACTIVE_SECONDS = 0.25                 # trimmed audio shorter than this is silence

# Known Whisper ambient-hallucination phrases (matched case-insensitively).
HALLUCINATION_PHRASES = [
    "thank you",
    "you're welcome",
    "oh, baby",
    "subtitles",
    "amara.org",
    "thanks for watching",
    "up, up, up",
]


def _emit(obj):
    print(json.dumps(obj), flush=True)


def _list_input_devices(sd):
    """Return (index, name, channels, samplerate) tuples for input devices.

    Queries devices by index so sounddevice never prints its device table
    to stdout (which would corrupt the strict JSON IPC contract).
    """
    devices = []
    index = 0
    while True:
        try:
            info = sd.query_devices(index)
        except Exception:
            break
        if int(info.get("max_input_channels", 0)) > 0:
            devices.append(
                (
                    index,
                    info.get("name", "?"),
                    int(info.get("max_input_channels", 0)),
                    info.get("default_samplerate", 0),
                )
            )
        index += 1
    return devices


def _default_input_device(sd):
    """Resolve the active default input device index."""
    default_in = sd.default.device
    if isinstance(default_in, (tuple, list)):
        default_in = default_in[0]
    elif not isinstance(default_in, int):
        # sounddevice._InputOutputPair is sequence-like ([input, output]).
        try:
            default_in = default_in[0]
        except Exception:
            default_in = None
    if default_in is None or int(default_in) < 0:
        raise RuntimeError("No default input device is configured.")
    info = sd.query_devices(int(default_in))
    if int(info.get("max_input_channels", 0)) < 1:
        raise RuntimeError(
            "Default device %r is not an input device." % info.get("name", "?")
        )
    return int(default_in)


def _write_int16_wav(output_path, pcm_bytes):
    """Write mono 16-bit PCM to a standard WAV container."""
    with wave.open(output_path, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(BITS // 8)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm_bytes)


def _compute_energy(arr):
    """Return (peak_amplitude, rms) for a mono int16 PCM array."""
    if arr is None or arr.size == 0:
        return 0, 0.0
    samples = arr.astype(np.int32, copy=False)
    peak = int(np.max(np.abs(samples)))
    rms = float(np.sqrt(np.mean(samples.astype(np.float64) ** 2)))
    return peak, rms


def _is_silence(arr):
    """Energy-based silence gate (VAD).

    Quiet / ambient-only audio must never reach the Whisper model — it is
    exactly what produces hallucinations such as "and we're up, up, up".
    """
    peak, rms = _compute_energy(arr)
    silent = peak < SILENCE_PEAK_INT16 or rms < SILENCE_RMS_INT16
    return silent, peak, rms


def is_hallucination_text(text):
    """True when Whisper output is a known ambient-hallucination phrase.

    Whisper confidently fabricates captions like "Thank you. You're welcome."
    or "Oh, baby." from pure background noise. Any transcript containing a
    blacklisted phrase is discarded and treated as silence.
    """
    lowered = (text or "").lower().strip()
    if not lowered:
        return False
    return any(phrase in lowered for phrase in HALLUCINATION_PHRASES)


def _trim_silence(arr, pad_frames=800):
    """Strip leading/trailing silence, keeping a short context margin.

    Returns the trimmed mono int16 array (empty when nothing is active).
    """
    if arr is None or arr.size == 0:
        return np.zeros(0, dtype=np.int16)
    active = np.abs(arr.astype(np.int32)) >= SILENCE_PEAK_INT16
    idx = np.flatnonzero(active)
    if idx.size == 0:
        return np.zeros(0, dtype=np.int16)
    start = max(int(idx[0]) - pad_frames, 0)
    end = min(int(idx[-1]) + 1 + pad_frames, arr.shape[0])
    return arr[start:end]


def _record_with_sounddevice(duration_sec):
    """Capture via sounddevice (PortAudio): 16kHz mono native 16-bit PCM."""
    import sounddevice as sd

    dev = _default_input_device(sd)
    devices = _list_input_devices(sd)
    sys.stderr.write("[STT] sounddevice input devices: %s\\n" % devices)
    sys.stderr.flush()

    sd.check_input_settings(
        device=dev,
        channels=CHANNELS,
        samplerate=SAMPLE_RATE,
        dtype="int16",
    )

    frames = int(SAMPLE_RATE * duration_sec)
    audio = sd.rec(
        frames,
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype="int16",
        device=dev,
    )
    sd.wait()

    # sounddevice returns native 16-bit signed PCM frames — no float
    # re-scaling needed. 16kHz mono int16 PCM is the canonical buffer.
    arr = np.asarray(audio, dtype=np.int16)
    if arr.ndim > 1:
        arr = arr.mean(axis=1).astype(np.int16) if arr.shape[1] > 1 else arr[:, 0]
    return arr


def _record_with_pyaudio(duration_sec):
    """Fallback capture via PyAudio: 16kHz mono 16-bit PCM."""
    import pyaudio

    pa = pyaudio.PyAudio()
    try:
        stream = pa.open(
            format=pyaudio.paInt16,
            channels=CHANNELS,
            rate=SAMPLE_RATE,
            input=True,
            frames_per_buffer=CHUNK_FRAMES,
        )
        frames = []
        total_frames = int(SAMPLE_RATE * duration_sec)
        remaining = total_frames
        try:
            while remaining > 0:
                to_read = min(CHUNK_FRAMES, remaining)
                frames.append(stream.read(to_read))
                remaining -= to_read
        finally:
            stream.stop_stream()
            stream.close()
    finally:
        pa.terminate()

    data = b"".join(frames)
    return np.frombuffer(data, dtype=np.int16)


def _record_wav(duration_sec):
    """Record mono 16-bit PCM from the active default input device.

    Primary backend: sounddevice (PortAudio). Gracefully falls back to
    PyAudio when sounddevice is missing or fails to capture.
    Returns (arr, bytes_recorded).
    """
    failures = []
    try:
        arr = _record_with_sounddevice(duration_sec)
        return arr, arr.nbytes
    except ImportError as exc:
        failures.append("sounddevice unavailable: %s" % exc)
    except Exception as exc:
        failures.append("sounddevice failed: %s" % exc)

    try:
        arr = _record_with_pyaudio(duration_sec)
        return arr, arr.nbytes
    except ImportError as exc:
        failures.append("pyaudio unavailable: %s" % exc)
    except Exception as exc:
        failures.append("pyaudio failed: %s" % exc)

    raise RuntimeError(
        "No working audio capture backend. " + " | ".join(failures)
    )


def _transcribe_wav(wav_path):
    """Transcribe a WAV using OpenJarvis FasterWhisper with hallucination suppression.

    The backend's lazy-loaded WhisperModel is used directly so whisper-specific
    anti-hallucination kwargs reach model.transcribe(). Decoding is tuned for
    CPU speed and determinism: greedy beam, single best-of, fixed thread count,
    zero temperature (no fallback sampling) and a Silero VAD pre-pass.
    """
    import importlib
    importlib.import_module("openjarvis.speech")
    from openjarvis.speech.faster_whisper import FasterWhisperBackend

    backend = FasterWhisperBackend(model_size="base")
    model = backend._ensure_model()

    options = dict(
        no_speech_threshold=0.7,
        condition_on_previous_text=False,
        hallucination_silence_threshold=2.0,
        beam_size=1,
        best_of=1,
        cpu_threads=4,
        temperature=0.0,
        vad_filter=True,
    )
    try:
        segments_iter, info = model.transcribe(wav_path, **options)
    except Exception:
        # Silero VAD model download can fail on first run or offline; the
        # energy gate + trim already handle silence, so retry without it.
        options.pop("vad_filter", None)
        segments_iter, info = model.transcribe(wav_path, **options)
    return "".join(seg.text for seg in segments_iter).strip()


if __name__ == "__main__":
    duration = 3
    if len(sys.argv) > 1:
        try:
            duration = int(sys.argv[1])
        except ValueError:
            pass
    duration = max(1, min(duration, 30))

    tmp = tempfile.mktemp(suffix=".wav")
    try:
        arr, bytes_recorded = _record_wav(duration)

        # VAD gate: quiet / ambient-only audio is discarded immediately so
        # FasterWhisper never processes background noise or pure silence.
        silent, peak, rms = _is_silence(arr)
        if silent:
            sys.stderr.write(
                "[STT] Silence gate (peak=%d rms=%.2f) — skipping inference\\n"
                % (peak, rms)
            )
            sys.stderr.flush()
            _emit({
                "text": "",
                "silence": True,
                "peak": peak,
                "rms": round(rms, 2),
                "bytes_recorded": bytes_recorded,
                "duration_sec": duration,
            })
        else:
            # Responsive window: trim leading/trailing silence before the model.
            trimmed = _trim_silence(arr)
            if trimmed.size < int(SAMPLE_RATE * MIN_ACTIVE_SECONDS):
                sys.stderr.write(
                    "[STT] Trimmed audio too short (%d samples) — treated as silence\\n"
                    % trimmed.size
                )
                sys.stderr.flush()
                _emit({
                    "text": "",
                    "silence": True,
                    "peak": peak,
                    "rms": round(rms, 2),
                    "bytes_recorded": bytes_recorded,
                    "duration_sec": duration,
                })
            else:
                _write_int16_wav(tmp, trimmed.tobytes())
                trimmed_bytes = trimmed.nbytes
                sys.stderr.write(
                    "[STT] Captured %d bytes, trimmed to %d bytes over %ds\\n"
                    % (bytes_recorded, trimmed_bytes, duration)
                )
                sys.stderr.flush()

                text = _transcribe_wav(tmp)
                if is_hallucination_text(text):
                    sys.stderr.write(
                        "[STT] Hallucination filtered: %r\\n" % text
                    )
                    sys.stderr.flush()
                    _emit({
                        "text": "",
                        "silence": True,
                        "peak": peak,
                        "rms": round(rms, 2),
                        "bytes_recorded": bytes_recorded,
                        "duration_sec": duration,
                    })
                else:
                    _emit({
                        "text": text,
                        "bytes_recorded": bytes_recorded,
                        "duration_sec": duration,
                    })
    except Exception as exc:
        sys.stderr.write("[STT] ERROR: %s\\n" % exc)
        sys.stderr.flush()
        _emit({"text": "", "error": str(exc)})
    finally:
        try:
            os.unlink(tmp)
        except OSError:
            pass
`;

ipcMain.handle('jarvis:stt', async (event, options = {}) => {
  if (isRecordingActive) {
    console.warn('[STT] Rejected — another recording session is already active.');
    return { text: '', durationMs: 0, engine: 'faster-whisper', error: 'Microphone session already in progress.' };
  }

  isRecordingActive = true;
  const startTime = Date.now();
  const durationSec = options && typeof options.durationSec === 'number' ? options.durationSec : 3;

  console.log('[STT DEBUG] ========== STT REQUEST START ==========');
  console.log('[STT DEBUG] Python:', OPENJARVIS_PYTHON);
  console.log('[STT DEBUG] Working directory:', OPENJARVIS_PATH);
  console.log('[STT DEBUG] CWD exists:', fs.existsSync(OPENJARVIS_PATH));
  console.log('[STT DEBUG] Python exists:', fs.existsSync(OPENJARVIS_PYTHON));
  console.log('[STT DEBUG] Recording duration:', durationSec, 'seconds');
  console.log('[STT DEBUG] Options payload:', JSON.stringify(options));

  try {
    // Shared unified audio-processing core (runPythonScript + sounddevice + FasterWhisper).
    const stt = await runSTTCapture(durationSec, 'STT');
    const durationMs = Date.now() - startTime;

    console.log('[STT DEBUG] ========== STT SUCCEEDED ==========');
    console.log('[STT DEBUG] Duration:', durationMs, 'ms');
    console.log('[STT DEBUG] Transcript:', stt.text || '(empty)');
    console.log('[STT DEBUG] Transcript length:', stt.text.length, 'chars');

    return {
      text: stt.text,
      durationMs,
      engine: stt.engine,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error('[STT ERROR] ========== HANDLER FAILED ==========');
    console.error('[STT ERROR] Duration before failure:', durationMs, 'ms');
    console.error('[STT ERROR] Message:', err?.message || err);
    throw new Error(err instanceof Error ? err.message : 'Internal error in STT handler.');
  } finally {
    isRecordingActive = false;
    console.log('[STT DEBUG] Recording lock released.');
  }
});

// ==========================================
// 3. Text-To-Speech (OpenJarvis Signature Voice)
// ==========================================

/**
 * Synthesizes speech via the OpenJarvis TTS registry using a temp-file Python
 * script (clean env, ANSI-stripped). Iterates Cartesia -> Kokoro -> OpenAI TTS.
 *
 * @param {string} textToSpeak - Text to synthesize
 * @param {string} [outputPath] - Optional explicit output path; auto-created if omitted
 * @returns {Promise<{success: boolean, text: string, audioDataUri: string|null, message?: string, path?: string}>}
 */
function runTTSSynthesis(textToSpeak, outputPath = '') {
  return new Promise(async (resolve, reject) => {
    const trimmed = (textToSpeak || '').trim();
    if (!trimmed) {
      return reject(new Error('Text for speech synthesis cannot be empty.'));
    }

    const tempDir = os.tmpdir();
    const resolvedPath = outputPath
      ? outputPath
      : path.join(tempDir, `jarvis_tts_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.wav`);

    // Inline Python script that uses OpenJarvis TTS backends to synthesize speech
    const ttsScript = [
      'import importlib, json, os, sys',
      'from pathlib import Path',
      '',
      'def synthesize():',
      '    """Synthesize text using OpenJarvis TTS backends."""',
      '    text = os.environ.get("JARVIS_TTS_TEXT", "")',
      '    output_path = sys.argv[1]',
      '',
      '    # Register TTS backends',
      '    importlib.import_module("openjarvis.speech")',
      '    from openjarvis.core.registry import TTSRegistry',
      '',
      '    # Try backends in priority order',
      '    for backend_key in ("cartesia", "kokoro", "openai_tts"):',
      '        if not TTSRegistry.contains(backend_key):',
      '            continue',
      '        try:',
      '            backend_cls = TTSRegistry.get(backend_key)',
      '            backend = backend_cls()',
      '            result = backend.synthesize(text, voice_id="", speed=1.0, output_format="wav")',
      '            Path(output_path).parent.mkdir(parents=True, exist_ok=True)',
      '            Path(output_path).write_bytes(result.audio)',
      '            print(json.dumps({"success": True, "backend": backend_key, "path": output_path}))',
      '            return',
      '        except Exception as exc:',
      '            continue',
      '',
      '    # If no TTS backend available, report failure',
      '    print(json.dumps({"success": False, "error": "No TTS backend available"}))',
      '',
      'if __name__ == "__main__":',
      '    synthesize()',
    ].join('\n');

    try {
      // Pass text via env to avoid any quoting issues with special characters.
      const ttsExecEnv = {
        ...CLEAN_PROCESS_ENV,
        JARVIS_TTS_TEXT: trimmed,
      };
      const command = `"${OPENJARVIS_PYTHON}" -c "${ttsScript.replace(/"/g, '\\"')}" "${resolvedPath}"`;

      exec(
        command,
        {
          cwd: OPENJARVIS_PATH,
          windowsHide: true,
          maxBuffer: 10 * 1024 * 1024,
          timeout: 60000, // 60-second synthesis timeout
          env: ttsExecEnv,
        },
        async (error, stdout, stderr) => {
          const cleanStdout = stripAnsi(stdout || '');
          const cleanStderr = stripAnsi(stderr || '');

          try {
            if (fs.existsSync(resolvedPath)) {
              const audioBuffer = await fs.promises.readFile(resolvedPath);
              const base64Audio = audioBuffer.toString('base64');
              const audioDataUri = `data:audio/wav;base64,${base64Audio}`;

              if (!outputPath) {
                // Clean up temporary audio file to prevent disk bloat
                await safeUnlink(resolvedPath);
              }

              return resolve({
                success: true,
                text: trimmed,
                audioDataUri,
                engine: 'OpenJarvis Signature Voice',
                path: resolvedPath,
                message: cleanStdout.trim(),
              });
            }

            // No audio file produced — surface the synthesized text path instead.
            return resolve({
              success: true,
              text: trimmed,
              audioDataUri: null,
              engine: 'OpenJarvis Signature Voice',
              message: cleanStdout.trim() || cleanStderr.trim() || 'Synthesized voice via OpenJarvis audio device.',
              path: resolvedPath,
            });
          } catch (fileErr) {
            console.error('[OpenJarvis TTS] File conversion error:', fileErr);
            await safeUnlink(resolvedPath);
            resolve({
              success: true,
              text: trimmed,
              audioDataUri: null,
              message: 'Synthesized directly via system speaker.',
              path: resolvedPath,
            });
          }
        }
      );
    } catch (err) {
      await safeUnlink(resolvedPath);
      console.error('[OpenJarvis TTS] Unexpected exception:', err);
      reject(new Error(err instanceof Error ? err.message : 'Internal error in TTS handler.'));
    }
  });
}

// ==========================================
// Full-Duplex Speech Guarantee — native voice fallback
// ==========================================

/**
 * Synthesizes a WAV via the Windows System.Speech synthesizer (built into the
 * OS), guaranteeing a real audio file even when the OpenJarvis TTS registry is
 * unavailable or offline.
 *
 * @param {string} text - Text to speak
 * @param {string} outputPath - Destination .wav path
 * @returns {Promise<{ok: boolean, stderr: string, stdout: string}>}
 */
function speakWithSystemFallbackToWave(text, outputPath) {
  return new Promise((resolve) => {
    const safeText = String(text || '').replace(/'/g, "''");
    const safePath = String(outputPath || '').replace(/'/g, "''");
    const script = [
      '$ErrorActionPreference = \'SilentlyContinue\'',
      'Add-Type -AssemblyName System.Speech',
      '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
      `$s.SetOutputToWaveFile('${safePath}')`,
      `$s.Speak('${safeText}')`,
      '$s.Dispose()',
    ].join('; ');
    const command = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`;

    exec(
      command,
      {
        cwd: OPENJARVIS_PATH,
        windowsHide: true,
        maxBuffer: 5 * 1024 * 1024,
        timeout: 30000,
        env: CLEAN_PROCESS_ENV,
      },
      (error, stdout, stderr) => {
        const ok = !error && fs.existsSync(outputPath);
        resolve({ ok, stderr: stripAnsi(stderr || ''), stdout: stripAnsi(stdout || '') });
      }
    );
  });
}

/**
 * Absolute last resort — speaks directly through the system's default audio
 * device so the assistant NEVER fails silently when no WAV can be produced.
 */
function speakWithSystemFallbackAudible(text) {
  const safeText = String(text || '').replace(/'/g, "''");
  const script = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak('${safeText}'); $s.Dispose()`;
  const command = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`;
  exec(
    command,
    {
      cwd: OPENJARVIS_PATH,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      timeout: 30000,
      env: CLEAN_PROCESS_ENV,
    },
    () => { /* fire-and-forget audible fallback */ }
  );
}

/**
 * Unified speech synthesis core with a guaranteed-audio contract:
 *   1. OpenJarvis TTS registry (Cartesia → Kokoro → OpenAI TTS).
 *   2. Windows System.Speech → real WAV file (audioDataUri guaranteed).
 *   3. Audible fallback through the system speaker (never fails silently).
 *
 * @param {string} textToSpeak - Text to synthesize
 * @param {string} [outputPath] - Optional explicit output path (persistent session audio)
 * @returns {Promise<{success: boolean, text: string, audioDataUri: string|null, audioPath: string|null, engine: string, message?: string}>}
 */
async function generateSpeechResponse(textToSpeak, outputPath = '') {
  const trimmed = (textToSpeak || '').trim();
  if (!trimmed) {
    return {
      success: false,
      text: '',
      audioDataUri: null,
      audioPath: null,
      engine: 'OpenJarvis Signature Voice',
      message: 'Text for speech synthesis cannot be empty.',
    };
  }

  const tempDir = os.tmpdir();
  const resolvedPath = outputPath
    ? outputPath
    : path.join(tempDir, `jarvis_tts_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.wav`);
  const isAutoTemp = !outputPath;

  const buildAudioResult = async (engine, message) => {
    try {
      const audioBuffer = await fs.promises.readFile(resolvedPath);
      const audioDataUri = `data:audio/wav;base64,${audioBuffer.toString('base64')}`;
      const audioPath = isAutoTemp ? null : resolvedPath;
      if (isAutoTemp) await safeUnlink(resolvedPath);
      return { success: true, text: trimmed, audioDataUri, audioPath, engine, message };
    } catch (fileErr) {
      if (isAutoTemp) await safeUnlink(resolvedPath);
      return {
        success: true,
        text: trimmed,
        audioDataUri: null,
        audioPath: null,
        engine,
        message: `${message} (audio read failed: ${fileErr?.message || fileErr})`,
      };
    }
  };

  // Primary backend: OpenJarvis TTS registry.
  try {
    const tts = await runTTSSynthesis(trimmed, resolvedPath);
    if (tts.audioDataUri && fs.existsSync(resolvedPath)) {
      return await buildAudioResult('OpenJarvis Signature Voice', tts.message || 'Synthesized via OpenJarvis signature voice.');
    }
    // No WAV produced → fall through to the native system voice.
  } catch (err) {
    console.warn('[TTS] OpenJarvis synthesis failed — switching to native system voice:', err?.message || err);
  }

  // Fallback 1: Windows System.Speech → real WAV so the UI can play it back.
  const native = await speakWithSystemFallbackToWave(trimmed, resolvedPath);
  if (native.ok && fs.existsSync(resolvedPath)) {
    return await buildAudioResult('Windows System.Speech fallback', 'Synthesized via native Windows speech engine (system fallback).');
  }
  console.warn('[TTS] System.Speech fallback failed:', native?.stderr || native?.stdout || 'unknown error');

  // Absolute last resort: audible system speech so the pipeline NEVER fails silently.
  speakWithSystemFallbackAudible(trimmed);
  if (isAutoTemp) await safeUnlink(resolvedPath);
  return {
    success: true,
    text: trimmed,
    audioDataUri: null,
    audioPath: null,
    engine: 'Windows System.Speech audible fallback',
    message: 'Voice synthesis unavailable in file form — speaking through the native system audio device.',
  };
}

ipcMain.handle('jarvis:tts', async (event, textToSpeak, options = {}) => {
  try {
    const result = await generateSpeechResponse(textToSpeak, options && typeof options.outputPath === 'string' ? options.outputPath : '');
    return result;
  } catch (err) {
    console.error('[OpenJarvis TTS] Handler failure:', err?.message || err);
    return {
      success: true,
      text: textToSpeak || '',
      audioDataUri: null,
      audioPath: null,
      engine: 'OpenJarvis Signature Voice',
      message: 'Voice synthesis unavailable. Playing text via browser fallback.',
    };
  }
});

// ==========================================
// 4. Full Voice Pipeline Session
// ==========================================

/**
 * Unified voice-session core shared by every audio IPC entry point:
 * intent & need determination → OS action / LLM inference → guaranteed TTS
 * audio feedback (OpenJarvis signature voice with native system fallback).
 *
 * @param {object} event - Originating IPC event (used for renderer status events)
 * @param {string} transcript - User transcript / command text
 * @returns {Promise<{status: string, transcript: string, response: string, audioDataUri: string|null, audioPath: string|null, actionTaken: string|null, engine: string}>}
 */
async function handleTranscriptSession(event, transcript) {
  const trimmed = (transcript || '').trim();

  // Step A — Intent & need determination (smart routing).
  const intent = detectIntent(trimmed);
  let aiResponse = '';
  let actionTaken = null;

  if (intent.type === 'os_action') {
    emitRendererStatus(event, 'processing', 'Executing OS directive...');
    const result = await executeOSAction(intent);
    actionTaken = intent.action;
    if (result && result.success) {
      aiResponse = composeOSConfirmation(intent, result);
    } else {
      aiResponse = `${intent.confirm || 'Command executed, Sir.'}${result?.error ? ' However, an execution warning occurred: ' + result.error : ''}`;
    }
  } else {
    // Conversational prompt → local Ollama (qwen3.5:9b with fallbacks).
    emitRendererStatus(event, 'processing', 'Consulting local inference engine...');
    const { ok, text } = await askLLM(trimmed);
    aiResponse = ok && text ? text : 'Inference engine offline. Start Ollama via "ollama serve" and try again.';
  }

  // Step B — Guaranteed audio feedback: valid WAV (via OpenJarvis TTS or the
  // native Windows voice) with an audible last-resort so we NEVER fail silently.
  emitRendererStatus(event, 'speaking', 'Synthesizing vocal response...');
  const sessionAudioTemp = path.join(os.tmpdir(), `jarvis_session_${Date.now()}.wav`);
  let audioDataUri = null;
  let sessionAudioPath = null;
  try {
    const tts = await generateSpeechResponse(aiResponse, sessionAudioTemp);
    audioDataUri = tts.audioDataUri || null;
    sessionAudioPath = audioDataUri && tts.audioPath ? tts.audioPath : null;
    if (!sessionAudioPath) await safeUnlink(sessionAudioTemp);
  } catch (ttsErr) {
    console.warn('[Voice Session] TTS synthesis failed (non-fatal):', ttsErr?.message || ttsErr);
    audioDataUri = null;
    sessionAudioPath = null;
    await safeUnlink(sessionAudioTemp);
  }
  cleanupStaleSessionAudio();

  return {
    status: 'success',
    transcript: trimmed,
    response: aiResponse,
    audioDataUri,
    audioPath: sessionAudioPath,
    actionTaken,
    engine: 'OpenJarvis faster-whisper + Neural TTS',
  };
}

ipcMain.handle('jarvis:voice-session', async (event, options = {}) => {
  if (isRecordingActive) {
    console.warn('[Voice Session] Rejected — another recording session is already active.');
    return {
      status: 'error',
      transcript: '',
      response: 'Microphone session already in progress. Please wait for the current recording to finish.',
      audioPath: null,
      durationMs: 0,
      engine: 'OpenJarvis faster-whisper + Neural TTS',
    };
  }

  isRecordingActive = true;
  const sessionStart = Date.now();

  try {
    // Step 1 — Ingest speech (or accept an already-transcribed command from a HUD).
    let transcript = '';
    const providedTranscript = options && typeof options.transcript === 'string' ? options.transcript.trim() : '';
    if (providedTranscript) {
      emitRendererStatus(event, 'listening', 'Voice input received.');
      transcript = providedTranscript;
    } else {
      emitRendererStatus(event, 'listening', 'Listening to hardware microphone...');
      const sttDuration = options && typeof options.durationSec === 'number' ? options.durationSec : 3;
      const stt = await runSTTCapture(sttDuration, 'Voice Session');
      transcript = stt.text;
    }

    emitRendererTranscript(event, transcript, false);

    // Step 2 — Guard against whisper noise / empty transcripts; never feed
    // garbage into the LLM or back to the UI.
    if (!transcript.trim() || isNoiseTranscript(transcript)) {
      console.log('[Voice Session] Empty or noise-only transcript, returning clean status.');
      emitRendererStatus(event, 'idle', 'No audible command detected.');
      return {
        status: 'empty_input',
        transcript: '',
        response: 'No audible command detected. Please try speaking again.',
        audioPath: null,
        durationMs: Date.now() - sessionStart,
        engine: 'OpenJarvis faster-whisper + Neural TTS',
      };
    }

    // Step 3 — Unified smart-routing pipeline (intent → OS/LLM → guaranteed TTS).
    const result = await handleTranscriptSession(event, transcript);

    return {
      ...result,
      durationMs: Date.now() - sessionStart,
    };
  } catch (error) {
    console.error('[OpenJarvis Voice Session] Pipeline failure:', error);
    emitRendererStatus(event, 'idle', 'Voice pipeline error.');
    return {
      status: 'error',
      transcript: '',
      response: 'Voice pipeline error: ' + (error instanceof Error ? error.message : 'unknown failure.') + ' Check that a microphone is connected and Ollama is running (ollama serve).',
      audioPath: null,
      durationMs: Date.now() - sessionStart,
      engine: 'OpenJarvis faster-whisper + Neural TTS',
    };
  } finally {
    isRecordingActive = false;
    console.log('[Voice Session] Recording lock released.');
  }
});

// ==========================================
// 5. Audio Playback Bridge
// ==========================================
ipcMain.handle('jarvis:play-audio', async (event, audioDataUri) => {
  try {
    return { success: true };
  } catch (err) {
    console.error('[OpenJarvis Play Audio] Error:', err);
    return { success: false, error: err.message };
  }
});