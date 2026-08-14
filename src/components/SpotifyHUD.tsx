import React, { useState } from 'react';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, Disc3, Radio, Sparkles, VolumeX } from 'lucide-react';
import { SpotifyState, SpotifyTrack } from '../types';
import { soundFx } from '../audio/soundFx';

interface SpotifyHUDProps {
  spotifyState: SpotifyState;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onSetVolume: (vol: number) => void;
}

export const SpotifyHUD: React.FC<SpotifyHUDProps> = ({
  spotifyState,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSetVolume,
}) => {
  const [activeTab, setActiveTab] = useState<'player' | 'soundboard'>('player');

  const sciFiSoundEffects = [
    { name: 'Arc Reactor Power Pulse', action: () => soundFx.playPowerPulse(), desc: 'Low frequency magnetic resonance' },
    { name: 'Wake Word Chime', action: () => soundFx.playWakeChime(), desc: 'Vocal activation frequency D5-A5' },
    { name: 'Scan / HUD Chirp', action: () => soundFx.playScanChirp(), desc: 'High-speed data radar sweep' },
    { name: 'Command Confirm', action: () => soundFx.playConfirmSound(), desc: 'Positive neural handshake' },
    { name: 'Security Alert Warning', action: () => soundFx.playErrorAlert(), desc: 'Hostile intrusion or syntax error' },
    { name: 'HUD Micro Click', action: () => soundFx.playHudClick(), desc: 'Tactile cybernetic feedback' },
  ];

  return (
    <div className="w-full flex flex-col gap-4 text-slate-200">
      
      {/* Top Selector: Music Deck vs Soundboard */}
      <div className="flex items-center gap-2 border-b border-cyan-900/60 pb-2">
        <button
          onClick={() => {
            soundFx.playHudClick();
            setActiveTab('player');
          }}
          className={`px-3 py-1 rounded font-orbitron text-xs tracking-wider transition-all ${
            activeTab === 'player'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400'
              : 'text-slate-400 hover:text-cyan-300'
          }`}
        >
          SPOTIFY CYBER DECK
        </button>
        <button
          onClick={() => {
            soundFx.playHudClick();
            setActiveTab('soundboard');
          }}
          className={`px-3 py-1 rounded font-orbitron text-xs tracking-wider transition-all ${
            activeTab === 'soundboard'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400'
              : 'text-slate-400 hover:text-cyan-300'
          }`}
        >
          HUD SOUNDBOARD SYNTH
        </button>
      </div>

      {activeTab === 'player' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Main Player Display */}
          <div className="hud-panel rounded p-5 border border-cyan-500/30 flex flex-col justify-between">
            <div className="flex items-center gap-4">
              {/* Rotating Holographic Disc */}
              <div className="relative w-20 h-20 rounded-full border-2 border-cyan-400/60 bg-black flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                <Disc3 className={`w-12 h-12 text-cyan-300 ${spotifyState.isPlaying ? 'animate-spin-slow' : ''}`} />
                <div className="absolute w-4 h-4 rounded-full bg-cyan-400/80 border border-white"></div>
              </div>

              <div className="min-w-0">
                <div className="text-[10px] font-mono-cyber text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  SPOTIFY CONNECT ACTIVE
                </div>
                <h3 className="font-orbitron text-base font-bold text-cyan-100 truncate mt-1">
                  {spotifyState.currentTrack.title}
                </h3>
                <p className="text-xs font-mono-cyber text-slate-400">
                  {spotifyState.currentTrack.artist} • {spotifyState.currentTrack.album}
                </p>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="mt-6 space-y-4">
              {/* Progress Bar */}
              <div className="space-y-1 font-mono-cyber text-[10px] text-slate-400">
                <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-cyan-900">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_8px_#22d3ee]"
                    style={{ width: `${(spotifyState.progressSec / spotifyState.currentTrack.durationSec) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between">
                  <span>{Math.floor(spotifyState.progressSec / 60)}:{(spotifyState.progressSec % 60).toString().padStart(2, '0')}</span>
                  <span>{Math.floor(spotifyState.currentTrack.durationSec / 60)}:{(spotifyState.currentTrack.durationSec % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={onPrevTrack}
                  className="p-2 rounded-full bg-black/40 hover:bg-cyan-950 text-cyan-300 border border-cyan-800 transition-all"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={onTogglePlay}
                  className="p-4 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold border border-cyan-300 transition-all shadow-[0_0_20px_rgba(34,211,238,0.6)]"
                >
                  {spotifyState.isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                <button
                  onClick={onNextTrack}
                  className="p-2 rounded-full bg-black/40 hover:bg-cyan-950 text-cyan-300 border border-cyan-800 transition-all"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-3 pt-2 font-mono-cyber text-xs">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={spotifyState.volume}
                  onChange={(e) => onSetVolume(Number(e.target.value))}
                  className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="w-8 text-right text-[10px] text-cyan-300">{spotifyState.volume}%</span>
              </div>
            </div>
          </div>

          {/* Quick Playlist & Voice Controls */}
          <div className="hud-panel rounded p-4 border border-cyan-500/30">
            <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-cyan-400" />
                <h3 className="font-orbitron text-xs font-bold tracking-wider text-cyan-300">
                  CURATED JARVIS PLAYLIST
                </h3>
              </div>
              <span className="text-[10px] font-mono-cyber text-slate-400">HQ 320 KBPS</span>
            </div>

            <div className="space-y-2 font-mono-cyber text-xs">
              {[
                { title: 'Drive (Synthwave Odyssey)', artist: 'Kavinsky & Daft Punk', time: '3:45' },
                { title: 'Stark Tower Ambient Pulse', artist: 'Ramin Djawadi', time: '4:12' },
                { title: 'Cyberpunk Overdrive', artist: 'Hyper', time: '3:10' },
                { title: 'Resonance & Quantum Echoes', artist: 'HOME', time: '3:32' },
              ].map((track, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    soundFx.playHudClick();
                    onNextTrack();
                  }}
                  className="p-2.5 rounded bg-black/40 hover:bg-cyan-950/60 border border-cyan-900/40 cursor-pointer flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">0{idx + 1}</span>
                    <div>
                      <div className="text-cyan-200 font-semibold">{track.title}</div>
                      <div className="text-[10px] text-slate-400">{track.artist}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-cyan-500">{track.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Soundboard View */
        <div className="hud-panel rounded p-4 border border-cyan-500/30">
          <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="font-orbitron text-xs font-bold tracking-wider text-cyan-300">
                WEB AUDIO HARDWARE SYNTHESIZER SOUNDBOARD
              </h3>
            </div>
            <span className="text-[10px] font-mono-cyber text-emerald-400">
              ZERO-DEPENDENCY REAL-TIME SYNTH
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sciFiSoundEffects.map((fx) => (
              <button
                key={fx.name}
                onClick={fx.action}
                className="p-3 rounded bg-black/50 hover:bg-cyan-950/70 border border-cyan-800/50 hover:border-cyan-400 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-orbitron text-xs font-semibold text-cyan-200 group-hover:text-cyan-100">
                    {fx.name}
                  </span>
                  <span className="text-[10px] font-mono-cyber text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-700">
                    PLAY ♫
                  </span>
                </div>
                <p className="text-[10px] font-mono-cyber text-slate-400">
                  {fx.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
