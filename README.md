# ⚡ J.A.R.V.I.S — Standalone Autonomous Cyber-HUD Desktop Assistant

[![Electron](https://img.shields.io/badge/Electron-30.0.0-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Windows](https://img.shields.io/badge/Platform-Windows_.exe-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://microsoft.com/windows)

> **"Just A Rather Very Intelligent System"** — An Iron Man-inspired standalone Windows desktop voice assistant and OS automation cockpit built with **Electron.js**, a decoupled **Python Audio Ingestion Daemon**, **React 19**, **Tailwind CSS**, and **LLM Function Calling**.

---

## 🏛️ Refactored Audio & System Architecture

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                1. NATIVE HARDWARE SENSORS & INPUTS                                |
|   🎙️ Microphone (PyAudio / Porcupine)     ⌨️ Global Hotkey (Ctrl+Shift+Space)   🗣️ Wake Word "Jarvis"|
+───────────────────────────────────────────────────────────────────────────────────────────────────+
                                                  │
                                                  ▼
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                 2. BACKGROUND PYTHON AUDIO INGESTION ENGINE (`speech_engine.py`)                  |
|                                                                                                   |
|  • pvporcupine: Zero-latency offline edge wake-word listening ("Hey Jarvis").                     |
|  • speech_recognition / faster-whisper: Hardware buffer ingestion & speech transcription.         |
|  • Cross-Process Streaming: Emits structured JSON events line-by-line over `stdout`.              |
|  • 100% Offline Resilience: Eliminates browser Web Speech API & remote Google server drops.      |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
                                                  │
                                                  │  [Standard I/O JSON Stream via child_process.spawn]
                                                  ▼
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                     3. ELECTRON MAIN PROCESS (`electron/main.js` / Node.js)                       |
|                                                                                                   |
|  • Spawns and supervises `speech_engine.py` (with auto-restart & error isolation).                |
|  • AI Intent & Tool Calling: Distinguishes between conversational/coding tasks vs OS commands.    |
|  • Strict OS Application Whitelist: Launches VS Code, Chrome, Spotify, PowerShell safely.         |
|  • Native PowerShell Screen Grab & Desktop File System Dispatcher.                                |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
                                                  │
                                                  │  [Secure Context-Isolated IPC: `preload.js`]
                                                  ▼
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                 4. REACT RENDERER PROCESS (Passive Cyber-HUD Display & Visualizer)                |
|                                                                                                   |
|  • Pure Display Client: Completely decoupled from microphone hardware to prevent browser errors.  |
|  • Passive IPC Listeners: Renders streaming transcripts, audio states, and Arc Reactor pulses.    |
|  • Code Rendering & Holographic Markdown Syntax Highlighting.                                     |
|  • Natural Speech Synthesis (TTS): Delivers authentic British Jarvis voice responses.             |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
```

---

## ⚙️ Why Decoupled Python Audio + `child_process.spawn`?

1. **Eliminating the Browser `Web Speech API` Bottleneck**: The native Chromium Web Speech API forces audio frames to Google cloud servers, generating continuous `network` error loops and requiring an active connection.
2. **Local Edge Wake-Word Detection**: `pvporcupine` runs directly on the CPU with zero latency, waking the system instantly when "Jarvis" is spoken.
3. **Non-Blocking I/O Architecture**: `child_process.spawn` uses standard streams (`stdout`/`stderr`), allowing Node.js and Python to communicate asynchronously without socket collisions or overhead.
4. **Crash Isolation**: If the microphone disconnects or an audio driver glitch occurs in Python, Node catches the exit event, broadcasts diagnostic logs to the HUD, and restarts the engine without terminating the user interface.

---

## 📂 Project Directory Structure

```
jarvis-assistant/
├── speech_engine.py             # Dedicated background Python audio & wake-word engine
├── electron/
│   ├── main.js                  # Electron Main Process (Spawns Python, IPC handlers, Hotkeys)
│   └── preload.js               # Context Bridge with strict IPC channels
├── src/
│   ├── audio/
│   │   ├── speechEngine.ts      # Frontend IPC proxy (Passive state listener & TTS speech)
│   │   └── soundFx.ts           # Web Audio procedural sound effects (Repulsor, chirps, beeps)
│   ├── components/
│   │   ├── ArcReactor.tsx       # Interactive pulsing core & audio-reactive visualizer
│   │   ├── AudioWaveform.tsx    # Real-time FFT audio spectrum bar visualizer
│   │   ├── ComputerControlHUD.tsx# OS command executor, whitelist controls, screenshot triggers
│   │   ├── HeaderHUD.tsx        # Top status bar, global metrics, and window controls
│   │   ├── SystemStatusPanel.tsx# CPU, RAM, Network, and Core telemetry visualizer
│   │   ├── TelemetryBar.tsx     # Bottom status telemetry metrics & quick actions
│   │   └── ArchitectureDocsHUD.tsx # In-app blueprint and documentation viewer
│   ├── types.ts                 # Shared TypeScript interfaces & IPC payload definitions
│   ├── index.css                # Futuristic Cyber-grid & Glowing Neon styling
│   ├── main.tsx                 # React entry point
│   └── App.tsx                  # Main HUD orchestrator and AI chat stream engine
├── server.ts                    # Backend AI Function Calling and Proxy Server
├── package.json                 # Project dependencies & build configuration
├── vite.config.ts               # Vite bundler configuration
└── tsconfig.json                # TypeScript compiler configuration
```

---

## 🛠️ Prerequisites

1. **Node.js**: `v18.0.0` or higher
2. **Python**: `v3.10` or higher (ensure `python` / `python3` is added to system `PATH`)
3. **OS**: Windows 10/11 (or macOS / Linux for development)
4. **Gemini API Key**: Set `GEMINI_API_KEY` in `.env` (optional for local heuristic mode)
5. **Picovoice Access Key** *(Optional for wake-word)*: Free key from [picovoice.ai](https://picovoice.ai)

---

## 🚀 Setup & Execution Guide

### 1. Clone Repository & Install Node Dependencies
```bash
git clone https://github.com/your-username/jarvis-assistant.git
cd jarvis-assistant
npm install
```

### 2. Set Up Python Virtual Environment & Audio Dependencies
Create and activate an isolated Python environment:

```bash
# On Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1

# On macOS/Linux:
python3 -m venv venv
source venv/bin/activate
```

Install the native audio processing packages:
```bash
# Core audio packages
pip install SpeechRecognition pyaudio pvporcupine

# Optional: Offline high-accuracy neural transcription
pip install faster-whisper
```

> **Windows Note for PyAudio**: If `pip install pyaudio` requires C++ build tools, install the pre-compiled wheel via `pip install pipwin && pipwin install pyaudio`.

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PICOVOICE_ACCESS_KEY=your_picovoice_key_here  # Optional for offline wake word
PORT=3000
NODE_ENV=development
```

### 4. Launch Development Environment
```bash
# Launch Vite frontend + Backend Express API:
npm run dev
```

### 5. Launch Full Standalone Desktop Application (Electron + Python)
```bash
# In a separate terminal with venv activated:
npx electron electron/main.js
```
The Electron window will boot, spawn the Python audio engine in the background, register global hotkeys (`Ctrl+Shift+Space`), and engage HUD telemetry.

---

## 📦 Bundling into Standalone Windows `.exe` Installer

Package J.A.R.V.I.S into a single distribution-ready `.exe` installer using `electron-builder`:

### 1. Build the React Web Bundle & Server
```bash
npm run build
```

### 2. Package for Windows NSIS Installer
```bash
npx electron-builder --win nsis --x64
```
The resulting installer `J.A.R.V.I.S-Setup-1.0.0.exe` and portable binary will be generated in `dist-electron/`.

---

## 🛡️ Security & Whitelist Specifications

- **IPC Context Isolation**: `contextIsolation: true` with strict argument validation prevents arbitrary script injection into Node.
- **Application Whitelist**: OS automation restricts application launches to pre-verified binaries (`vscode`, `spotify`, `chrome`, `terminal`, `notepad`, `calc`, `explorer`).
- **Memory & File Sandboxing**: Document and artifact writes are sanitized and confined to `~/Desktop/`.

---

## 📄 License
MIT License. Crafted with Stark Industries Cyberpunk Aesthetics.
