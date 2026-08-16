/**
 * OpenJarvis Native Audio & Voice Service
 * 
 * ARCHITECTURAL SPECIFICATION:
 * - Bridges React UI components to native audio operations via Electron IPC.
 * - Handles faster-whisper Speech-To-Text (STT) ingestion.
 * - Handles OpenJarvis signature neural Text-To-Speech (TTS) audio playback.
 * - Provides non-blocking HTML5 / Web Audio playback with fallback handling.
 */

import { STTResult, TTSResult, VoiceSessionResult } from '../types';

let currentAudioElement: HTMLAudioElement | null = null;

/**
 * Triggers native faster-whisper microphone recording and transcription.
 */
export async function captureSpeechSTT(): Promise<STTResult> {
  if (typeof window === 'undefined' || !window.electronAPI?.listenSTT) {
    throw new Error('Native faster-whisper STT requires the Electron desktop runtime with OpenJarvis.');
  }

  try {
    const result = await window.electronAPI.listenSTT();
    return result;
  } catch (error: any) {
    console.error('[Audio Service] STT failed:', error);
    throw new Error(error?.message || 'Failed to capture or transcribe audio via faster-whisper.');
  }
}

/**
 * Synthesizes speech using the original OpenJarvis signature voice engine.
 */
export async function synthesizeSpeechTTS(text: string): Promise<TTSResult> {
  const trimmed = text?.trim();
  if (!trimmed) {
    throw new Error('Speech text cannot be empty.');
  }

  if (typeof window === 'undefined' || !window.electronAPI?.speakTTS) {
    throw new Error('OpenJarvis signature TTS requires the Electron desktop runtime.');
  }

  try {
    const result = await window.electronAPI.speakTTS(trimmed);
    return result;
  } catch (error: any) {
    console.error('[Audio Service] TTS failed:', error);
    throw new Error(error?.message || 'Failed to synthesize speech via OpenJarvis voice engine.');
  }
}

/**
 * Runs a full-duplex voice session (STT -> OpenJarvis Query -> Signature TTS).
 */
export async function runFullVoiceSession(): Promise<VoiceSessionResult> {
  if (typeof window === 'undefined' || !window.electronAPI?.startVoiceSession) {
    throw new Error('Voice session pipeline requires the Electron desktop runtime with OpenJarvis.');
  }

  try {
    const result = await window.electronAPI.startVoiceSession();
    return result;
  } catch (error: any) {
    console.error('[Audio Service] Voice session error:', error);
    throw new Error(error?.message || 'Voice session encounter an error in execution.');
  }
}

/**
 * Plays an audio stream / Data URI with defensive error handling and event lifecycle hooks.
 */
export function playAudioStream(
  audioDataUri: string, 
  onEnded?: () => void,
  onError?: (err: Error) => void
): () => void {
  // Stop existing playback if active
  stopAudioPlayback();

  try {
    const audio = new Audio(audioDataUri);
    currentAudioElement = audio;

    audio.onended = () => {
      currentAudioElement = null;
      if (onEnded) onEnded();
    };

    audio.onerror = (e) => {
      currentAudioElement = null;
      console.warn('[Audio Service] Audio playback error:', e);
      if (onError) onError(new Error('Audio playback device encountered an error.'));
      if (onEnded) onEnded();
    };

    audio.play().catch((playErr) => {
      console.warn('[Audio Service] Audio autoplay error:', playErr);
      if (onError) onError(new Error(playErr?.message || 'Failed to start audio playback.'));
      if (onEnded) onEnded();
    });

    // Return stop callback
    return () => {
      if (currentAudioElement === audio) {
        stopAudioPlayback();
      }
    };
  } catch (err: any) {
    console.error('[Audio Service] Instantiation error:', err);
    if (onError) onError(err);
    if (onEnded) onEnded();
    return () => {};
  }
}

/**
 * Stops any currently active audio playback.
 */
export function stopAudioPlayback(): void {
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
    } catch (e) {
      console.warn('[Audio Service] Pause warning:', e);
    }
    currentAudioElement = null;
  }
}
