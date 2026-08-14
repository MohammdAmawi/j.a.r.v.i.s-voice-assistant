import { soundFx } from './soundFx';

type SpeechCallback = (text: string, isFinal: boolean) => void;
type StateCallback = (isListening: boolean) => void;
type ErrorCallback = (error: string) => void;

/**
 * J.A.RV.I.S Frontend Audio & Speech Proxy
 * 
 * ARCHITECTURAL JUSTIFICATION:
 * - Native audio capture has been completely extracted into the background Python daemon (speech_engine.py).
 * - Web Speech API (webkitSpeechRecognition) has been decommissioned from the browser/renderer to eliminate
 *   network flakiness, Google cloud server roundtrips, and continuous 'network' error loops.
 * - This proxy bridges events incoming from Electron's IPC layer (`window.jarvisAPI`) to React components,
 *   while retaining client-side Text-to-Speech (speechSynthesis) for audible response rendering.
 */
class SpeechEngineProxy {
  private isListening: boolean = false;
  private wakeWord: string = 'jarvis';
  private voicePitch: number = 0.9;
  private voiceRate: number = 1.0;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  
  private onTranscriptCallbacks: SpeechCallback[] = [];
  private onStateCallbacks: StateCallback[] = [];
  private onErrorCallbacks: ErrorCallback[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initVoices();
      this.initIpcListeners();
    }
  }

  private initVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const selectVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const jarvisLikeVoice = 
        voices.find(v => v.lang.includes('en-GB') && (v.name.includes('Male') || v.name.includes('Oliver') || v.name.includes('George') || v.name.includes('Daniel') || v.name.includes('Arthur'))) ||
        voices.find(v => v.lang.includes('en-GB')) ||
        voices.find(v => v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('guy') || v.name.toLowerCase().includes('david')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0];
      
      this.preferredVoice = jarvisLikeVoice || null;
    };

    selectVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = selectVoice;
    }
  }

  private initIpcListeners() {
    if (typeof window === 'undefined') return;

    const jarvisAPI = (window as any).jarvisAPI;
    if (jarvisAPI) {
      // Listen to status updates from Python daemon
      jarvisAPI.onAudioStatus?.((data: any) => {
        const listening = data?.state === 'listening' || data?.state === 'capturing_speech';
        this.isListening = listening;
        this.notifyState(listening);
      });

      // Listen to transcripts parsed by Python speech engine
      jarvisAPI.onAudioTranscript?.((data: any) => {
        if (data?.text) {
          this.notifyTranscript(data.text, data.isFinal ?? true);
        }
      });

      // Listen to wake word event
      jarvisAPI.onWakeWordTriggered?.(() => {
        soundFx.playWakeChime();
        this.isListening = true;
        this.notifyState(true);
      });

      // Listen to warnings / errors
      jarvisAPI.onAudioWarning?.((data: any) => {
        if (data?.message) {
          this.notifyError(data.message);
        }
      });
    }
  }

  public onTranscript(cb: SpeechCallback) {
    this.onTranscriptCallbacks.push(cb);
    return () => {
      this.onTranscriptCallbacks = this.onTranscriptCallbacks.filter(c => c !== cb);
    };
  }

  public onStateChange(cb: StateCallback) {
    this.onStateCallbacks.push(cb);
    return () => {
      this.onStateCallbacks = this.onStateCallbacks.filter(c => c !== cb);
    };
  }

  public onError(cb: ErrorCallback) {
    this.onErrorCallbacks.push(cb);
    return () => {
      this.onErrorCallbacks = this.onErrorCallbacks.filter(c => c !== cb);
    };
  }

  private notifyTranscript(text: string, isFinal: boolean) {
    this.onTranscriptCallbacks.forEach(cb => cb(text, isFinal));
  }

  private notifyState(isListening: boolean) {
    this.onStateCallbacks.forEach(cb => cb(isListening));
  }

  private notifyError(error: string) {
    this.onErrorCallbacks.forEach(cb => cb(error));
  }

  public setWakeWord(word: string) {
    this.wakeWord = word;
  }

  public getWakeWord(): string {
    return this.wakeWord;
  }

  public setListening(listening: boolean) {
    this.isListening = listening;
    this.notifyState(listening);
  }

  public startListening(): boolean {
    this.isListening = true;
    this.notifyState(true);
    soundFx.playWakeChime();
    return true;
  }

  public stopListening() {
    this.isListening = false;
    this.notifyState(false);
  }

  public toggleListening(): boolean {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      return this.startListening();
    }
  }

  public speak(text: string, onEnd?: () => void): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        if (onEnd) onEnd();
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const cleanedText = text
        .replace(/```[\s\S]*?```/g, 'Code snippet rendered in holographic terminal.')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_#>-]/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.rate = this.voiceRate;
      utterance.pitch = this.voicePitch;

      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }

      utterance.onend = () => {
        if (onEnd) onEnd();
        resolve();
      };

      utterance.onerror = () => {
        if (onEnd) onEnd();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

export const speechEngine = new SpeechEngineProxy();
