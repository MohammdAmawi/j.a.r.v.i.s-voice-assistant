import React, { useState } from 'react';
import { FileCode2, Copy, Check, Download, Layers, ShieldAlert, Cpu, Terminal, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import { soundFx } from '../audio/soundFx';

export const ArchitectureDocsHUD: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'implementation' | 'readme' | 'security'>('architecture');
  const [copied, setCopied] = useState(false);

  const fullReadmeContent = `# J.A.R.V.I.S — Voice-Activated AI Local OS Assistant (Pro Tier)

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev)
[![Gemini / Claude](https://img.shields.io/badge/AI%20Brain-Gemini%203.7%20%7C%20Claude%203.5-purple.svg)](https://ai.google.dev)

> A cutting-edge, futuristic, voice-activated AI assistant named **J.A.R.V.I.S** equipped with Pro-Tier local computer control capabilities, dynamic document authoring, real-time speech recognition & synthesis, and bi-directional hardware communication.

---

## 🏛️ 1. System Architecture (The "WHY" Before the "HOW")

### The High-Level Topology
\`\`\`text
┌────────────────────────────────────────────────────────┐
│                   FRONTEND CLIENT                      │
│  React 19 • Tailwind CSS • Web Audio • Web Speech API │
└──────────────────────────┬─────────────────────────────┘
                           │ Bi-directional WebSockets / HTTP
                           ▼
┌────────────────────────────────────────────────────────┐
│                   BACKEND GATEWAY                      │
│     Node.js • Express • WebSocket Server (ws/Socket)   │
└────────────┬─────────────┬─────────────┬───────────────┘
             │             │             │
             ▼             ▼             ▼
┌──────────────────┐ ┌───────────┐ ┌────────────────────┐
│   LOCAL OS CORE  │ │ PERSISTED │ │   AI BRAIN ENGINE  │
│ child_process &  │ │  MEMORY   │ │ Gemini 3.7 Flash / │
│   fs Controller  │ │ JSON/SQL  │ │ Claude 3.5 Sonnet  │
└──────────────────┘ └───────────┘ └────────────────────┘
\`\`\`

### Architectural Justifications:
1. **Why Node.js Backend with \`child_process\` for OS Execution?**
   - Web browsers run in a strict security sandbox and cannot directly open desktop apps, execute shell commands, or manipulate system processes.
   - The Node.js backend acts as a privileged host bridge. By running locally, it leverages \`child_process.exec\` and \`child_process.spawn\` to execute OS operations with custom security filters.
2. **Why Web Speech API + Web Audio Synthesizer?**
   - Web Speech API provides zero-latency client-side continuous speech recognition (STT) without sending uncompressed audio across expensive cloud billing endpoints.
   - The custom Web Audio API oscillator stack creates instant, low-latency Iron Man HUD audio cues without needing external MP3/WAV assets.
3. **Why Server-Side AI Brain with Function Calling?**
   - Direct browser calls to LLM APIs expose confidential API keys in client JavaScript bundles.
   - Server-side routing ensures that API keys remain protected in \`.env\` while allowing the backend to inject persistent long-term memory before querying the model.

---

## 📁 2. Project Folder Structure

\`\`\`text
jarvis-assistant/
├── jarvis_storage/            # Local persisted files & JSON memory
│   ├── memory.json            # Long-term context & user preferences
│   └── documents.json         # Dynamic generated files
├── src/
│   ├── audio/
│   │   ├── soundFx.ts         # Web Audio API Synthesizer (Chimes, Pulses)
│   │   └── speechEngine.ts    # Web Speech API STT & TTS controller
│   ├── components/
│   │   ├── HeaderHUD.tsx      # Top cyber header with real-time HUD clock
│   │   ├── ArcReactor.tsx     # Concentric reactive holographic core
│   │   ├── AudioWaveform.tsx  # Dynamic frequency bar visualizer
│   │   ├── SystemStatusPanel.tsx # HUD telemetry & voice status
│   │   ├── ComputerControlHUD.tsx # OS App launcher & Shell Terminal
│   │   ├── FileManagerHUD.tsx # Document creator (MD, TXT, PDF, JSON)
│   │   ├── SpotifyHUD.tsx     # Music player & soundboard synth
│   │   ├── MemoryHUD.tsx      # SQLite / JSON long-term memory inspector
│   │   ├── WebSearchHUD.tsx   # Grounded web intelligence search
│   │   ├── TestRunnerHUD.tsx  # Automated Unit/Integration test suite
│   │   └── TelemetryBar.tsx   # Bottom status bar with CPU/RAM/Net
│   ├── types.ts               # Shared TypeScript schemas
│   ├── App.tsx                # Main HUD layout & state machine
│   ├── main.tsx               # Client entry point
│   └── index.css              # Cyber grid styling & keyframe animations
├── server.ts                  # Express backend & OS child_process controller
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite bundler configuration
└── README.md                  # Complete production documentation
\`\`\`

---

## ⚙️ 3. Prerequisites & Installation

### Requirements:
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- **Modern Browser**: Chrome, Edge, or Brave (for Web Speech API support)

### Installation Steps:
\`\`\`bash
# 1. Clone repository
git clone https://github.com/your-username/jarvis-voice-assistant.git
cd jarvis-voice-assistant

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and supply your GEMINI_API_KEY (optional, local engine fallback works automatically)

# 4. Start the application
npm run dev
\`\`\`
Visit **http://localhost:3000** in your browser.

---

## 🔒 4. Security Protocols & Common Pitfalls

### Pitfall 1: Arbitrary Command Injection
- **Risk**: Allowing the AI or user to run arbitrary shell commands can lead to destructive outcomes like \`rm -rf /\`.
- **Mitigation**: The backend employs a security filter regex pattern:
\`\`\`typescript
const destructivePatterns = [/rm\\s+-rf\\s+\\//, /mkfs/, /dd\\s+if=/, />\\s*\\/dev\\/sd/, /:(){ :|:& };:/];
if (destructivePatterns.some(p => p.test(command))) {
  throw new Error("Command blocked by J.A.R.V.I.S Security Protocol.");
}
\`\`\`

### Pitfall 2: Client-Side API Key Leaks
- **Risk**: Storing \`GEMINI_API_KEY\` in React frontend code exposes credentials in DevTools.
- **Mitigation**: All AI requests are routed exclusively via \`POST /api/gemini/chat\` on the Express server.

---

## 🧪 5. Testing & Verification

Run the built-in automated test suite:
\`\`\`bash
npm run lint
npm run build
\`\`\`
Or open the **TEST SUITE** tab inside the J.A.R.V.I.S UI for live interactive testing!
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullReadmeContent);
    setCopied(true);
    soundFx.playConfirmSound();
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([fullReadmeContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    soundFx.playConfirmSound();
  };

  return (
    <div className="w-full flex flex-col gap-4 text-slate-200">
      
      {/* Sub navigation bar */}
      <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 font-orbitron text-xs">
          {[
            { id: 'architecture', label: '1. SYSTEM ARCHITECTURE' },
            { id: 'implementation', label: '2. CODE & FOLDER STRUCTURE' },
            { id: 'security', label: '3. SECURITY & PITFALLS' },
            { id: 'readme', label: '4. COMPLETE README.MD' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                soundFx.playHudClick();
                setActiveTab(id as any);
              }}
              className={`px-3 py-1.5 rounded tracking-wider transition-all ${
                activeTab === id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Action Buttons: Copy & Download README */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-700/70 text-cyan-300 font-mono-cyber text-xs flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY README'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-orbitron text-xs flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.4)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>DOWNLOAD README.MD</span>
          </button>
        </div>
      </div>

      {/* Content Panels */}
      {activeTab === 'architecture' && (
        <div className="hud-panel rounded p-5 border border-cyan-500/30 space-y-4 font-mono-cyber text-xs">
          <div className="flex items-center gap-2 border-b border-cyan-900/60 pb-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="font-orbitron text-sm font-bold text-cyan-300 tracking-wider">
              FULL-STACK ARCHITECTURAL SPECIFICATION & DESIGN DECISIONS
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 rounded bg-black/50 border border-cyan-900/60 space-y-2">
              <div className="text-cyan-400 font-bold text-xs uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Layer 1: Futuristic UI Client
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Constructed with React 19 and Tailwind CSS. Features an interactive Arc Reactor HUD, real-time Web Speech STT, Web Audio synthesizer, and reactive telemetry counters.
              </p>
            </div>

            <div className="p-3.5 rounded bg-black/50 border border-cyan-900/60 space-y-2">
              <div className="text-cyan-400 font-bold text-xs uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Layer 2: Local OS Bridge Gateway
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Powered by Node.js & Express. Utilizes <code className="text-cyan-300">child_process</code> to launch native desktop apps (VS Code, Chrome, Terminal) and <code className="text-cyan-300">fs</code> for file persistence.
              </p>
            </div>

            <div className="p-3.5 rounded bg-black/50 border border-cyan-900/60 space-y-2">
              <div className="text-cyan-400 font-bold text-xs uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Layer 3: Neural AI & Memory DB
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Server-side Gemini 3.7 Flash router with function calling, grounding, and persistent JSON context store retaining user preferences across sessions.
              </p>
            </div>
          </div>

          <div className="bg-black/60 p-4 rounded border border-cyan-900/60 text-slate-300 space-y-2">
            <h4 className="font-bold text-cyan-300 font-orbitron text-xs tracking-wider">
              THE "WHY" BEHIND ARCHITECTURAL CHOICES
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-[11px]">
              <li><strong>Zero-Latency Audio Synth:</strong> Rather than streaming audio assets over network hops, Web Audio API synthesizes chimes on the client instantly.</li>
              <li><strong>Privilege Separation:</strong> The UI client cannot directly execute shell commands; all execution requests pass through a strictly filtered Node.js gateway.</li>
              <li><strong>Air-Tight Token Security:</strong> LLM API keys are exclusively handled on the Node server, preventing any client-side bundle extraction.</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'implementation' && (
        <div className="hud-panel rounded p-5 border border-cyan-500/30 space-y-4 font-mono-cyber text-xs">
          <div className="flex items-center gap-2 border-b border-cyan-900/60 pb-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="font-orbitron text-sm font-bold text-cyan-300 tracking-wider">
              CORE BACKEND & FRONTEND CODE SNIPPETS
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-cyan-400 font-semibold mb-1 text-[11px]">
                1. Node.js OS Execution Bridge (server.ts)
              </div>
              <pre className="p-3 bg-black/80 rounded border border-cyan-900/60 text-cyan-100 text-[11px] overflow-x-auto">
{`import { exec } from 'child_process';

app.post('/api/os/execute', (req, res) => {
  const { command } = req.body;
  // Security guardrail: filter destructive commands
  if (/rm\\s+-rf\\s+\\//.test(command)) {
    return res.status(403).json({ error: 'Command blocked by security protocol.' });
  }

  exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
    if (error) return res.json({ success: false, output: stderr || error.message });
    res.json({ success: true, output: stdout });
  });
});`}
              </pre>
            </div>

            <div>
              <div className="text-cyan-400 font-semibold mb-1 text-[11px]">
                2. Continuous Web Speech Voice Trigger (speechEngine.ts)
              </div>
              <pre className="p-3 bg-black/80 rounded border border-cyan-900/60 text-cyan-100 text-[11px] overflow-x-auto">
{`const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = true;

recognition.onresult = (event) => {
  const text = event.results[event.results.length - 1][0].transcript.toLowerCase();
  if (text.includes("jarvis")) {
    soundFx.playWakeChime();
    handleJarvisCommand(text.replace("jarvis", "").trim());
  }
};`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="hud-panel rounded p-5 border border-cyan-500/30 space-y-4 font-mono-cyber text-xs">
          <div className="flex items-center gap-2 border-b border-cyan-900/60 pb-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h3 className="font-orbitron text-sm font-bold text-cyan-300 tracking-wider">
              SECURITY PROTOCOLS & DEPLOYMENT TROUBLESHOOTING
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
            <div className="p-3 rounded bg-black/50 border border-amber-900/40 space-y-1.5">
              <h4 className="text-amber-400 font-bold">1. Command Injection Prevention</h4>
              <p className="text-slate-300">
                Never pass untrusted user input directly to shell without validation. Use an allowed command list or strict regex filters to block destructive commands.
              </p>
            </div>

            <div className="p-3 rounded bg-black/50 border border-amber-900/40 space-y-1.5">
              <h4 className="text-amber-400 font-bold">2. Microphone Permissions in iFrames</h4>
              <p className="text-slate-300">
                In sandboxed iFrames, browser security may restrict microphone access. The application includes both continuous voice input and full-featured text command fallback.
              </p>
            </div>

            <div className="p-3 rounded bg-black/50 border border-amber-900/40 space-y-1.5">
              <h4 className="text-amber-400 font-bold">3. Cross-Platform Desktop Hooks</h4>
              <p className="text-slate-300">
                The launcher detects <code className="text-cyan-300">os.platform()</code> to issue correct commands: <code className="text-cyan-300">open -a</code> (macOS), <code className="text-cyan-300">start</code> (Windows), or <code className="text-cyan-300">xdg-open</code> (Linux).
              </p>
            </div>

            <div className="p-3 rounded bg-black/50 border border-amber-900/40 space-y-1.5">
              <h4 className="text-amber-400 font-bold">4. API Token Isolation</h4>
              <p className="text-slate-300">
                Ensure <code className="text-cyan-300">.env</code> is added to <code className="text-cyan-300">.gitignore</code>. In AI Studio, tokens are managed automatically via the Secrets panel.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'readme' && (
        <div className="hud-panel rounded p-5 border border-cyan-500/30">
          <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3 font-mono-cyber text-xs">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <h3 className="font-orbitron text-xs font-bold text-cyan-300 tracking-wider">
                README.MD PRODUCTION BLUEPRINT
              </h3>
            </div>
            <span className="text-slate-400 text-[10px]">
              Ready for GitHub Repository
            </span>
          </div>

          <pre className="p-4 bg-black/80 rounded border border-cyan-900/60 text-slate-300 text-xs font-mono max-h-96 overflow-y-auto whitespace-pre-wrap select-text">
            {fullReadmeContent}
          </pre>
        </div>
      )}

    </div>
  );
};
