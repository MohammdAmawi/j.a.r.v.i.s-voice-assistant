/**
 * TEST SUITE 4 — Service Layer: openJarvisAudioService.ts
 *
 * Coverage:
 *  ✔ captureSpeechSTT   — environment guard, success, IPC error propagation
 *  ✔ synthesizeSpeechTTS — empty text guard, environment guard, success, error
 *  ✔ runFullVoiceSession — environment guard, success, error
 *  ✔ playAudioStream    — Audio instantiation, onended/onerror callbacks, stop fn
 *  ✔ stopAudioPlayback  — pauses and nulls currentAudioElement
 *  ✔ playAudioStream    — stops existing playback before starting new one
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  captureSpeechSTT,
  synthesizeSpeechTTS,
  runFullVoiceSession,
  playAudioStream,
  stopAudioPlayback,
} from '../services/openJarvisAudioService';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers — re-attach a fresh electronAPI before each test
// ──────────────────────────────────────────────────────────────────────────────
function setElectronAPI(overrides: Partial<typeof window.electronAPI>) {
  Object.defineProperty(window, 'electronAPI', {
    value: overrides,
    configurable: true,
    writable: true,
  });
}

function clearElectronAPI() {
  Object.defineProperty(window, 'electronAPI', {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// captureSpeechSTT
// ══════════════════════════════════════════════════════════════════════════════
describe('captureSpeechSTT', () => {
  it('throws when electronAPI is undefined (browser mode)', async () => {
    clearElectronAPI();
    await expect(captureSpeechSTT()).rejects.toThrow(
      'Native faster-whisper STT requires the Electron desktop runtime with OpenJarvis.'
    );
  });

  it('throws when listenSTT is undefined on electronAPI', async () => {
    setElectronAPI({ askJarvis: vi.fn() }); // no listenSTT
    await expect(captureSpeechSTT()).rejects.toThrow(
      'Native faster-whisper STT requires the Electron desktop runtime with OpenJarvis.'
    );
  });

  it('returns STTResult on success', async () => {
    const mockResult = { text: 'hello sir', durationMs: 300, engine: 'faster-whisper' };
    setElectronAPI({ listenSTT: vi.fn().mockResolvedValue(mockResult) });
    const result = await captureSpeechSTT();
    expect(result).toEqual(mockResult);
  });

  it('propagates IPC error with message', async () => {
    setElectronAPI({
      listenSTT: vi.fn().mockRejectedValue(new Error('No microphone detected')),
    });
    await expect(captureSpeechSTT()).rejects.toThrow('No microphone detected');
  });

  it('wraps non-Error rejection with generic message', async () => {
    setElectronAPI({ listenSTT: vi.fn().mockRejectedValue('audio device error') });
    await expect(captureSpeechSTT()).rejects.toThrow(
      'Failed to capture or transcribe audio via faster-whisper.'
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// synthesizeSpeechTTS
// ══════════════════════════════════════════════════════════════════════════════
describe('synthesizeSpeechTTS', () => {
  it('throws when text is empty', async () => {
    await expect(synthesizeSpeechTTS('')).rejects.toThrow('Speech text cannot be empty.');
  });

  it('throws when text is whitespace only', async () => {
    await expect(synthesizeSpeechTTS('   ')).rejects.toThrow('Speech text cannot be empty.');
  });

  it('throws when electronAPI is undefined', async () => {
    clearElectronAPI();
    await expect(synthesizeSpeechTTS('Hello')).rejects.toThrow(
      'OpenJarvis signature TTS requires the Electron desktop runtime.'
    );
  });

  it('throws when speakTTS is absent from electronAPI', async () => {
    setElectronAPI({ askJarvis: vi.fn() });
    await expect(synthesizeSpeechTTS('Hello')).rejects.toThrow(
      'OpenJarvis signature TTS requires the Electron desktop runtime.'
    );
  });

  it('passes trimmed text to speakTTS IPC method', async () => {
    const mockFn = vi.fn().mockResolvedValue({ success: true, text: 'Hello', audioDataUri: null });
    setElectronAPI({ speakTTS: mockFn });
    await synthesizeSpeechTTS('  Hello  ');
    expect(mockFn).toHaveBeenCalledWith('Hello');
  });

  it('returns TTSResult on success', async () => {
    const mockResult = {
      success: true,
      text: 'Hello',
      audioDataUri: 'data:audio/wav;base64,abc',
      engine: 'OpenJarvis Signature Voice',
    };
    setElectronAPI({ speakTTS: vi.fn().mockResolvedValue(mockResult) });
    const result = await synthesizeSpeechTTS('Hello');
    expect(result).toEqual(mockResult);
  });

  it('propagates IPC error message', async () => {
    setElectronAPI({
      speakTTS: vi.fn().mockRejectedValue(new Error('TTS binary missing')),
    });
    await expect(synthesizeSpeechTTS('Hello')).rejects.toThrow('TTS binary missing');
  });

  it('provides generic fallback for non-Error TTS rejection', async () => {
    setElectronAPI({ speakTTS: vi.fn().mockRejectedValue('crash') });
    await expect(synthesizeSpeechTTS('Hello')).rejects.toThrow(
      'Failed to synthesize speech via OpenJarvis voice engine.'
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// runFullVoiceSession
// ══════════════════════════════════════════════════════════════════════════════
describe('runFullVoiceSession', () => {
  it('throws when electronAPI is undefined', async () => {
    clearElectronAPI();
    await expect(runFullVoiceSession()).rejects.toThrow(
      'Voice session pipeline requires the Electron desktop runtime with OpenJarvis.'
    );
  });

  it('throws when startVoiceSession is absent', async () => {
    setElectronAPI({ askJarvis: vi.fn() });
    await expect(runFullVoiceSession()).rejects.toThrow(
      'Voice session pipeline requires the Electron desktop runtime with OpenJarvis.'
    );
  });

  it('returns VoiceSessionResult on success', async () => {
    const mockResult = {
      transcript: 'open the pod bay doors',
      response: "I'm sorry Dave",
      audioDataUri: null,
      durationMs: 1200,
      status: 'success' as const,
    };
    setElectronAPI({ startVoiceSession: vi.fn().mockResolvedValue(mockResult) });
    const result = await runFullVoiceSession();
    expect(result).toEqual(mockResult);
  });

  it('propagates error from session pipeline', async () => {
    setElectronAPI({
      startVoiceSession: vi.fn().mockRejectedValue(new Error('pipeline failure')),
    });
    await expect(runFullVoiceSession()).rejects.toThrow('pipeline failure');
  });

  it('wraps non-Error rejection', async () => {
    setElectronAPI({ startVoiceSession: vi.fn().mockRejectedValue(null) });
    await expect(runFullVoiceSession()).rejects.toThrow(
      'Voice session encounter an error in execution.'
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// playAudioStream
// ══════════════════════════════════════════════════════════════════════════════
describe('playAudioStream', () => {
  let mockAudioInstance: {
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
    onerror: ((e: unknown) => void) | null;
    currentTime: number;
  };

  beforeEach(() => {
    mockAudioInstance = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      onended: null,
      onerror: null,
      currentTime: 0,
    };

    // Inject mock Audio constructor using function() so it works with `new Audio()`
    vi.stubGlobal('Audio', vi.fn(function () {
      return mockAudioInstance;
    }));
  });

  it('creates an Audio instance with the provided URI', () => {
    playAudioStream('data:audio/wav;base64,abc');
    expect(Audio).toHaveBeenCalledWith('data:audio/wav;base64,abc');
  });

  it('calls audio.play()', () => {
    playAudioStream('data:audio/wav;base64,abc');
    expect(mockAudioInstance.play).toHaveBeenCalled();
  });

  it('calls onEnded callback when audio.onended fires', () => {
    const onEnded = vi.fn();
    playAudioStream('data:audio/wav;base64,abc', onEnded);
    mockAudioInstance.onended!();
    expect(onEnded).toHaveBeenCalled();
  });

  it('calls onError callback when audio.onerror fires', () => {
    const onError = vi.fn();
    const onEnded = vi.fn();
    playAudioStream('data:audio/wav;base64,abc', onEnded, onError);
    mockAudioInstance.onerror!({});
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    // onEnded should also be called after onerror
    expect(onEnded).toHaveBeenCalled();
  });

  it('calls onError when play() rejects (autoplay policy)', async () => {
    const onError = vi.fn();
    const onEnded = vi.fn();
    const playErr = new Error('NotAllowedError: autoplay blocked');
    mockAudioInstance.play.mockRejectedValue(playErr);

    playAudioStream('data:audio/wav;base64,abc', onEnded, onError);
    // Wait for microtask queue to flush the promise rejection
    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('NotAllowedError') }));
  });

  it('returns a stop callback that pauses the audio', () => {
    const stopFn = playAudioStream('data:audio/wav;base64,abc');
    stopFn();
    expect(mockAudioInstance.pause).toHaveBeenCalled();
  });

  it('stops previous audio before starting new stream', () => {
    const firstInstance = { ...mockAudioInstance, play: vi.fn().mockResolvedValue(undefined) };
    const AudioCtor = vi.fn()
      .mockImplementationOnce(function () { return firstInstance; })
      .mockImplementationOnce(function () { return mockAudioInstance; });
    vi.stubGlobal('Audio', AudioCtor);

    playAudioStream('data:audio/wav;base64,first');
    playAudioStream('data:audio/wav;base64,second');

    // The first instance should have been paused when second stream started
    expect(firstInstance.pause).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// stopAudioPlayback
// ══════════════════════════════════════════════════════════════════════════════
describe('stopAudioPlayback', () => {
  it('does not throw when no audio is currently playing', () => {
    expect(() => stopAudioPlayback()).not.toThrow();
  });

  it('pauses and resets currentTime of active audio element', () => {
    const mockAudio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      onended: null,
      onerror: null,
      currentTime: 42,
    };
    vi.stubGlobal('Audio', vi.fn(function () { return mockAudio; }));

    playAudioStream('data:audio/wav;base64,test');
    stopAudioPlayback();

    expect(mockAudio.pause).toHaveBeenCalled();
    expect(mockAudio.currentTime).toBe(0);
  });
});
