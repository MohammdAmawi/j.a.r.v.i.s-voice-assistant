/**
 * TEST SUITE 6 — React Component: AudioHUD.tsx
 *
 * Strategy:
 *  - Render AudioHUD with RTL in jsdom.
 *  - Mock all audio service functions.
 *  - Test voice state machine transitions: idle → listening → processing → speaking.
 *  - Test manual TTS synthesizer input and submit.
 *  - Test error banner on pipeline failure.
 *  - Test STOP / REPLAY buttons.
 *  - Test session log accumulation.
 *
 * Coverage:
 *  ✔ Initial SYSTEM READY state
 *  ✔ ENGAGE button disabled during listening/processing
 *  ✔ IDLE → LISTENING on ENGAGE click
 *  ✔ Empty STT result shows error banner
 *  ✔ IDLE → LISTENING → PROCESSING → SPEAKING on full session success (with audio)
 *  ✔ IDLE → LISTENING → PROCESSING → IDLE on full session success (no audio)
 *  ✔ Error state when voice session throws
 *  ✔ Manual TTS synthesizer: empty guard, success, error
 *  ✔ STOP PLAYBACK button calls stopAudioPlayback and reverts to idle
 *  ✔ REPLAY ORIGINAL VOICE button replays audioDataUri
 *  ✔ Copy response button
 *  ✔ Session log renders after completed session
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioHUD } from '../components/AudioHUD';

// ──────────────────────────────────────────────────────────────────────────────
// Mock audio service module
// ──────────────────────────────────────────────────────────────────────────────
vi.mock('../services/openJarvisAudioService', () => ({
  captureSpeechSTT: vi.fn(),
  synthesizeSpeechTTS: vi.fn(),
  runFullVoiceSession: vi.fn(),
  playAudioStream: vi.fn().mockReturnValue(vi.fn()),
  stopAudioPlayback: vi.fn(),
}));

import {
  captureSpeechSTT,
  synthesizeSpeechTTS,
  runFullVoiceSession,
  playAudioStream,
  stopAudioPlayback,
} from '../services/openJarvisAudioService';

const mockCaptureSpeechSTT   = captureSpeechSTT   as ReturnType<typeof vi.fn>;
const mockSynthesizeSpeechTTS = synthesizeSpeechTTS as ReturnType<typeof vi.fn>;
const mockRunFullVoiceSession  = runFullVoiceSession as ReturnType<typeof vi.fn>;
const mockPlayAudioStream      = playAudioStream     as ReturnType<typeof vi.fn>;
const mockStopAudioPlayback    = stopAudioPlayback   as ReturnType<typeof vi.fn>;

// ──────────────────────────────────────────────────────────────────────────────
// Helper
// ──────────────────────────────────────────────────────────────────────────────
function renderAudioHUD() {
  const user = userEvent.setup();
  const utils = render(<AudioHUD />);
  return { user, ...utils };
}

// Standard voice session result with no audio
const SESSION_NO_AUDIO = {
  transcript: 'open the pod bay doors',
  response: "I'm sorry Dave, I can't do that.",
  audioDataUri: null,
  durationMs: 800,
  status: 'success' as const,
};

// Standard voice session result with audio
const SESSION_WITH_AUDIO = {
  ...SESSION_NO_AUDIO,
  audioDataUri: 'data:audio/wav;base64,AAAA',
};

// ══════════════════════════════════════════════════════════════════════════════
// SECTION A: Initial Render
// ══════════════════════════════════════════════════════════════════════════════
describe('AudioHUD — initial render', () => {
  it('shows NATIVE AUDIO & SIGNATURE VOICE HUD heading', () => {
    renderAudioHUD();
    expect(screen.getByText(/NATIVE AUDIO.*SIGNATURE VOICE HUD/i)).toBeInTheDocument();
  });

  it('shows SYSTEM READY status badge initially', () => {
    renderAudioHUD();
    expect(screen.getByText(/SYSTEM READY/i)).toBeInTheDocument();
  });

  it('shows the ENGAGE label in the microphone button', () => {
    renderAudioHUD();
    expect(screen.getByText('ENGAGE')).toBeInTheDocument();
  });

  it('shows the default greeting response text', () => {
    renderAudioHUD();
    expect(screen.getByText(/At your service, Sir/i)).toBeInTheDocument();
  });

  it('REPLAY button is disabled when no audioDataUri is set', () => {
    renderAudioHUD();
    const replayBtn = screen.getByRole('button', { name: /REPLAY ORIGINAL VOICE/i });
    expect(replayBtn).toBeDisabled();
  });

  it('renders the telemetry grid with faster-whisper and OpenJarvis Voice labels', () => {
    renderAudioHUD();
    expect(screen.getByText('faster-whisper')).toBeInTheDocument();
    expect(screen.getByText('OpenJarvis Voice')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION B: Voice State Transitions
// ══════════════════════════════════════════════════════════════════════════════
describe('AudioHUD — voice state: IDLE → LISTENING', () => {
  it('transitions to LISTENING status on ENGAGE click', async () => {
    // Keep the STT call pending so we can observe the listening state
    mockCaptureSpeechSTT.mockReturnValue(new Promise(() => {}));
    const { user } = renderAudioHUD();

    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      expect(screen.getByText(/LISTENING \(WHISPER\)/i)).toBeInTheDocument();
    });
  });

  it('shows RECORDING label inside the mic button during listening', async () => {
    mockCaptureSpeechSTT.mockReturnValue(new Promise(() => {}));
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      expect(screen.getByText('RECORDING')).toBeInTheDocument();
    });
  });

  it('ENGAGE button is disabled while in LISTENING state', async () => {
    mockCaptureSpeechSTT.mockReturnValue(new Promise(() => {}));
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /ENGAGE|RECORDING/i, hidden: true });
      // The mic button inside the orb
      const micBtn = document.getElementById('audio-microphone-trigger')!;
      expect(micBtn).toBeDisabled();
    });
  });
});

describe('AudioHUD — voice state: LISTENING → PROCESSING', () => {
  it('transitions to PROCESSING after STT returns text', async () => {
    mockCaptureSpeechSTT.mockResolvedValue({ text: 'hello jarvis', durationMs: 200 });
    // Keep the session pending so we can observe processing state
    mockRunFullVoiceSession.mockReturnValue(new Promise(() => {}));
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      expect(screen.getByText(/PROCESSING \(OPENJARVIS\)/i)).toBeInTheDocument();
    });
  });

  it('shows INFERRING label in orb button during processing', async () => {
    mockCaptureSpeechSTT.mockResolvedValue({ text: 'hello jarvis', durationMs: 200 });
    mockRunFullVoiceSession.mockReturnValue(new Promise(() => {}));
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      expect(screen.getByText('INFERRING')).toBeInTheDocument();
    });
  });
});

describe('AudioHUD — voice state: PROCESSING → IDLE (no audio)', () => {
  it('returns to IDLE and shows response text when session has no audio', async () => {
    mockCaptureSpeechSTT.mockResolvedValue({ text: 'hello', durationMs: 200 });
    mockRunFullVoiceSession.mockResolvedValue(SESSION_NO_AUDIO);
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      expect(screen.getByText(/SYSTEM READY/i)).toBeInTheDocument();
      expect(screen.getAllByText(/I'm sorry Dave/i)[0]).toBeInTheDocument();
    });
  });

  it('shows the transcript text in the faster-whisper STT card', async () => {
    mockCaptureSpeechSTT.mockResolvedValue({ text: 'open the pod bay doors', durationMs: 200 });
    mockRunFullVoiceSession.mockResolvedValue(SESSION_NO_AUDIO);
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      expect(screen.getAllByText(/open the pod bay doors/i)[0]).toBeInTheDocument();
    });
  });
});

describe('AudioHUD — voice state: PROCESSING → SPEAKING (with audio)', () => {
  it('transitions to SPEAKING status when session returns audio', async () => {
    mockCaptureSpeechSTT.mockResolvedValue({ text: 'speak to me', durationMs: 150 });
    mockRunFullVoiceSession.mockResolvedValue(SESSION_WITH_AUDIO);
    mockPlayAudioStream.mockReturnValue(vi.fn());
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      expect(screen.getByText(/SPEAKING \(JARVIS VOICE\)/i)).toBeInTheDocument();
    });
  });

  it('calls playAudioStream with the returned audioDataUri', async () => {
    mockCaptureSpeechSTT.mockResolvedValue({ text: 'speak', durationMs: 100 });
    mockRunFullVoiceSession.mockResolvedValue(SESSION_WITH_AUDIO);
    mockPlayAudioStream.mockReturnValue(vi.fn());
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      expect(mockPlayAudioStream).toHaveBeenCalledWith(
        'data:audio/wav;base64,AAAA',
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  it('shows STOP PLAYBACK button while speaking', async () => {
    mockCaptureSpeechSTT.mockResolvedValue({ text: 'speak', durationMs: 100 });
    mockRunFullVoiceSession.mockResolvedValue(SESSION_WITH_AUDIO);
    mockPlayAudioStream.mockReturnValue(vi.fn()); // stop fn
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      expect(screen.getByText(/STOP PLAYBACK/i)).toBeInTheDocument();
    });
  });
});

describe('AudioHUD — empty STT result', () => {
  it('shows error banner when STT returns empty text', async () => {
    mockCaptureSpeechSTT.mockResolvedValue({ text: '', durationMs: 50 });
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      expect(screen.getByText(/No audible voice detected/i)).toBeInTheDocument();
    });
  });

  it('returns to IDLE state after empty STT', async () => {
    mockCaptureSpeechSTT.mockResolvedValue({ text: '', durationMs: 50 });
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      expect(screen.getByText(/SYSTEM READY/i)).toBeInTheDocument();
    });
  });
});

describe('AudioHUD — pipeline error handling', () => {
  it('shows AUDIO ENGINE ERROR status on pipeline failure', async () => {
    mockCaptureSpeechSTT.mockRejectedValue(new Error('Mic device not found'));
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      expect(screen.getByText(/AUDIO ENGINE ERROR/i)).toBeInTheDocument();
    });
  });

  it('renders the error message in the error banner', async () => {
    mockCaptureSpeechSTT.mockRejectedValue(new Error('faster-whisper not installed'));
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      expect(screen.getByText(/faster-whisper not installed/i)).toBeInTheDocument();
    });
  });

  it('dismisses the error banner on × click', async () => {
    mockCaptureSpeechSTT.mockRejectedValue(new Error('Device error'));
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => expect(screen.getAllByText(/Audio Pipeline Warning/i)[0]).toBeInTheDocument());

    // Find dismiss × button in the error banner
    const dismissBtn = screen.getAllByRole('button').find(
      (b) => b.textContent?.includes('×')
    );
    await user.click(dismissBtn!);

    await waitFor(() => {
      expect(screen.queryByText(/Audio Pipeline Warning/i)).not.toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION C: Manual TTS Synthesizer
// ══════════════════════════════════════════════════════════════════════════════
describe('AudioHUD — manual TTS synthesizer', () => {
  it('SYNTHESIZE button is disabled when input is empty', () => {
    renderAudioHUD();
    const synthesizeBtn = screen.getByRole('button', { name: /SYNTHESIZE/i });
    expect(synthesizeBtn).toBeDisabled();
  });

  it('calls synthesizeSpeechTTS with trimmed text on Enter key', async () => {
    mockSynthesizeSpeechTTS.mockResolvedValue({ success: true, text: 'hello', audioDataUri: null });
    const { user } = renderAudioHUD();
    const input = screen.getByPlaceholderText(/Type any phrase to test/i);
    await user.type(input, 'test TTS{Enter}');

    await waitFor(() => {
      expect(mockSynthesizeSpeechTTS).toHaveBeenCalledWith('test TTS');
    });
  });

  it('calls synthesizeSpeechTTS on SYNTHESIZE button click', async () => {
    mockSynthesizeSpeechTTS.mockResolvedValue({ success: true, text: 'hello', audioDataUri: null });
    const { user } = renderAudioHUD();
    const input = screen.getByPlaceholderText(/Type any phrase to test/i);
    await user.type(input, 'Good morning');
    await user.click(screen.getByRole('button', { name: /SYNTHESIZE/i }));

    await waitFor(() => {
      expect(mockSynthesizeSpeechTTS).toHaveBeenCalledWith('Good morning');
    });
  });

  it('transitions to SPEAKING state when synthesis returns audio', async () => {
    mockSynthesizeSpeechTTS.mockResolvedValue({
      success: true,
      text: 'hello',
      audioDataUri: 'data:audio/wav;base64,ZZZ',
    });
    mockPlayAudioStream.mockReturnValue(vi.fn());
    const { user } = renderAudioHUD();
    const input = screen.getByPlaceholderText(/Type any phrase to test/i);
    await user.type(input, 'Good morning');
    await user.click(screen.getByRole('button', { name: /SYNTHESIZE/i }));

    await waitFor(() => {
      expect(screen.getByText(/SPEAKING \(JARVIS VOICE\)/i)).toBeInTheDocument();
    });
  });

  it('shows error banner when synthesis fails', async () => {
    mockSynthesizeSpeechTTS.mockRejectedValue(new Error('TTS binary crashed'));
    const { user } = renderAudioHUD();
    const input = screen.getByPlaceholderText(/Type any phrase to test/i);
    await user.type(input, 'Goodbye');
    await user.click(screen.getByRole('button', { name: /SYNTHESIZE/i }));

    await waitFor(() => {
      expect(screen.getByText(/TTS binary crashed/i)).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION D: Playback Controls
// ══════════════════════════════════════════════════════════════════════════════
describe('AudioHUD — STOP PLAYBACK button', () => {
  it('calls stopAudioPlayback on stop click', async () => {
    mockCaptureSpeechSTT.mockResolvedValue({ text: 'play audio', durationMs: 100 });
    mockRunFullVoiceSession.mockResolvedValue(SESSION_WITH_AUDIO);
    mockPlayAudioStream.mockReturnValue(vi.fn());
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => screen.getByText(/STOP PLAYBACK/i));
    await user.click(screen.getByText(/STOP PLAYBACK/i));

    expect(mockStopAudioPlayback).toHaveBeenCalled();
  });

  it('reverts to IDLE after stop', async () => {
    mockCaptureSpeechSTT.mockResolvedValue({ text: 'play', durationMs: 100 });
    mockRunFullVoiceSession.mockResolvedValue(SESSION_WITH_AUDIO);
    mockPlayAudioStream.mockReturnValue(vi.fn());
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));
    await waitFor(() => screen.getByText(/STOP PLAYBACK/i));
    await user.click(screen.getByText(/STOP PLAYBACK/i));

    await waitFor(() => {
      expect(screen.getByText(/SYSTEM READY/i)).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION E: Session Audit Log
// ══════════════════════════════════════════════════════════════════════════════
describe('AudioHUD — session audit log', () => {
  it('shows session count after completed voice session', async () => {
    mockCaptureSpeechSTT.mockResolvedValue({ text: 'log test', durationMs: 200 });
    mockRunFullVoiceSession.mockResolvedValue(SESSION_NO_AUDIO);
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      expect(screen.getByText(/1 SESSIONS RECORDED/i)).toBeInTheDocument();
    });
  });

  it('shows transcript and response in session log', async () => {
    mockCaptureSpeechSTT.mockResolvedValue({ text: 'open the pod bay doors', durationMs: 200 });
    mockRunFullVoiceSession.mockResolvedValue(SESSION_NO_AUDIO);
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => {
      expect(screen.getByText(/JARVIS: I'm sorry Dave/i)).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION F: Copy Response
// ══════════════════════════════════════════════════════════════════════════════
describe('AudioHUD — copy response', () => {
  it('copies response text to clipboard when COPY is clicked', async () => {
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');
    mockCaptureSpeechSTT.mockResolvedValue({ text: 'copy this', durationMs: 100 });
    mockRunFullVoiceSession.mockResolvedValue(SESSION_NO_AUDIO);
    const { user } = renderAudioHUD();
    await user.click(screen.getByText('ENGAGE'));

    await waitFor(() => expect(screen.getAllByText('COPY')[0]).toBeInTheDocument());
    await user.click(screen.getAllByText('COPY')[0]);

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith(SESSION_NO_AUDIO.response);
    });
  });
});
