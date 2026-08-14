import React, { useEffect, useState } from 'react';
import { AssistantState } from '../types';

interface AudioWaveformProps {
  state: AssistantState;
  isListening: boolean;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ state, isListening }) => {
  const [bars, setBars] = useState<number[]>(Array(32).fill(6));

  useEffect(() => {
    let interval: any;

    if (state === 'speaking' || isListening || state === 'processing') {
      interval = setInterval(() => {
        setBars(prev => {
          return prev.map((_, i) => {
            // Symmetrical bell-curve like waveform with higher amplitude in the middle
            const centerFactor = 1 - Math.abs(i - 16) / 16;
            const multiplier = state === 'speaking' ? 36 : isListening ? 24 : 14;
            const randomJitter = Math.random() * multiplier * centerFactor;
            return Math.max(4, Math.min(48, Math.floor(randomJitter + 4)));
          });
        });
      }, 70);
    } else {
      // Idle gentle subtle wave
      interval = setInterval(() => {
        const time = Date.now() / 600;
        setBars(prev => {
          return prev.map((_, i) => {
            const wave = Math.sin(time + i * 0.3) * 3 + 6;
            return Math.max(3, Math.floor(wave));
          });
        });
      }, 120);
    }

    return () => clearInterval(interval);
  }, [state, isListening]);

  return (
    <div className="flex items-center justify-center gap-[3px] h-12 px-6 py-2 select-none">
      {bars.map((height, idx) => {
        const isCenter = Math.abs(idx - 16) < 6;
        return (
          <div
            key={idx}
            className="w-[3px] rounded-full transition-all duration-75"
            style={{
              height: `${height}px`,
              backgroundColor: isCenter ? '#22d3ee' : '#0891b2',
              boxShadow: isCenter ? '0 0 8px #22d3ee' : 'none',
              opacity: isCenter ? 1 : 0.75,
            }}
          />
        );
      })}
    </div>
  );
};
