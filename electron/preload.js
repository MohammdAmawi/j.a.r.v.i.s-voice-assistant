/**
 * J.A.R.V.I.S — Electron Secure Preload Script
 * 
 * ARCHITECTURAL JUSTIFICATION:
 * In modern Electron (v20+), running Node.js APIs directly in the renderer process
 * is an extreme security risk (Remote Code Execution / XSS escalation). 
 * By enabling `contextIsolation: true` and `nodeIntegration: false`, the Renderer 
 * process is completely isolated in a chromium sandbox.
 * 
 * The `contextBridge.exposeInMainWorld` API selectively punches safe, typed portals
 * through the IPC layer into the `window.jarvisAPI` namespace, exposing ONLY validated
 * command channels and event listeners.
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * OpenJarvis Electron API Gateway
 * Exposes safe, isolated IPC invocations for local AI execution and native audio processing.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Text Chat Bridge
  askJarvis: (text) => ipcRenderer.invoke('ask-jarvis', text),

  // Native Audio & Voice Bridges (faster-whisper STT & OpenJarvis Neural TTS)
  listenSTT: (options) => ipcRenderer.invoke('jarvis:stt', options),
  speakTTS: (text, options) => ipcRenderer.invoke('jarvis:tts', text, options),
  startVoiceSession: (options) => ipcRenderer.invoke('jarvis:voice-session', options),
  playJarvisAudio: (audioDataUri) => ipcRenderer.invoke('jarvis:play-audio', audioDataUri),
});

contextBridge.exposeInMainWorld('jarvisAPI', {
  // === OS & AUTOMATION BRIDGES ===
  executeCommand: (command) => ipcRenderer.invoke('os:execute-command', command),
  launchApp: (appName) => ipcRenderer.invoke('os:launch-app', appName),
  openExternalUrl: (url) => ipcRenderer.invoke('os:open-url', url),
  takeScreenshot: () => ipcRenderer.invoke('os:take-screenshot'),
  saveFileToDesktop: (options) => ipcRenderer.invoke('fs:save-desktop', options),
  getSystemMetrics: () => ipcRenderer.invoke('system:get-metrics'),

  // === AI STREAMING & CHAT BRIDGES ===
  sendAiPrompt: (payload) => ipcRenderer.invoke('ai:prompt', payload),
  onAiStreamChunk: (callback) => {
    const subscription = (_event, chunk) => callback(chunk);
    ipcRenderer.on('ai:stream-chunk', subscription);
    return () => ipcRenderer.removeListener('ai:stream-chunk', subscription);
  },

  // === BACKGROUND PYTHON AUDIO ENGINE LISTENERS (PASSIVE UI) ===
  onAudioStatus: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('audio:status', subscription);
    return () => ipcRenderer.removeListener('audio:status', subscription);
  },
  onAudioTranscript: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('audio:transcript', subscription);
    return () => ipcRenderer.removeListener('audio:transcript', subscription);
  },
  onWakeWordTriggered: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('audio:wake_word', subscription);
    return () => ipcRenderer.removeListener('audio:wake_word', subscription);
  },
  onAudioWarning: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('audio:warning', subscription);
    return () => ipcRenderer.removeListener('audio:warning', subscription);
  },
  onAiStatus: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('ai:status', subscription);
    return () => ipcRenderer.removeListener('ai:status', subscription);
  },
  onAiResponse: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('ai:response', subscription);
    return () => ipcRenderer.removeListener('ai:response', subscription);
  },

  // === HOTKEYS ===
  onGlobalShortcutTriggered: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('hotkey:toggle-mic', subscription);
    return () => ipcRenderer.removeListener('hotkey:toggle-mic', subscription);
  },

  // === WINDOW CONTROLS ===
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),


});

