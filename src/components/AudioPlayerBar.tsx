import React, { useState, useEffect, useRef } from 'react';
import { AudioTrack } from '../types';

interface AudioPlayerBarProps {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextTrack?: () => void;
  onPrevTrack?: () => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
}) => {
  const [progress, setProgress] = useState(260); // in seconds
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  // Web Audio synth for ambient sound simulation
  const audioCtxRef = useRef<AudioContext | null>(null);
  const osc1Ref = useRef<OscillatorNode | null>(null);
  const osc2Ref = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const totalSeconds = currentTrack?.durationSeconds || 765;

  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= totalSeconds) {
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalSeconds]);

  // Audio Synth Trigger
  useEffect(() => {
    if (isPlaying) {
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioCtxRef.current = new AudioContextClass();
          }
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }

        if (audioCtxRef.current) {
          // Stop old oscillators
          if (osc1Ref.current) osc1Ref.current.stop();
          if (osc2Ref.current) osc2Ref.current.stop();

          const ctx = audioCtxRef.current;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'triangle';
          // Meditative Sa-Pa harmonic (136.1 Hz OM / 204.15 Hz)
          osc1.frequency.setValueAtTime(136.1, ctx.currentTime);
          osc2.frequency.setValueAtTime(204.15, ctx.currentTime);

          gain.gain.setValueAtTime(isMuted ? 0 : volume * 0.05, ctx.currentTime);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start();
          osc2.start();

          osc1Ref.current = osc1;
          osc2Ref.current = osc2;
          gainRef.current = gain;
        }
      } catch (err) {
        // Audio API fallback gracefully
      }
    } else {
      if (gainRef.current && audioCtxRef.current) {
        gainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
      }
    }

    return () => {
      if (osc1Ref.current) {
        try {
          osc1Ref.current.stop();
        } catch (e) {}
      }
      if (osc2Ref.current) {
        try {
          osc2Ref.current.stop();
        } catch (e) {}
      }
    };
  }, [isPlaying, isMuted, volume]);

  if (!currentTrack) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const percent = Math.min(100, Math.max(0, (progress / totalSeconds) * 100));

  return (
    <div className="fixed bottom-0 left-0 md:left-[280px] right-0 h-24 bg-[#19202e]/95 backdrop-blur-3xl border-t border-[#f2ca50]/20 flex items-center px-4 md:px-8 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
      {/* Left: Track Details */}
      <div className="flex items-center gap-4 w-1/4 min-w-[180px]">
        <div
          className="w-14 h-14 bg-cover bg-center rounded-lg shadow-xl border border-white/10 flex-shrink-0"
          style={{
            backgroundImage: `url('${
              currentTrack.coverUrl ||
              'https://lh3.googleusercontent.com/aida-public/AB6AXuDV00S2P4sDgIunuVzzX_pApC2-zJ7vDFbMIMbR6ENaw5-EYmg1OdigwWTnz4DxuxK2YDtu_kriGd6nbKh5uQuYt2ie3QqMbGY-SrYTqGzDeoBg-dztdOdSfDiMGMw1619lz0PTZUB_nUyiBihYAeiQY7D9hExYmQ9v0mlV234VsUPpeIFBEEWArRNsde26aaN9PZIBigJYigHL67jCdD2PNQPgJaYJJXkLL9vQFfseaFyJKMqxxy9yMw'
            }')`,
          }}
        />
        <div className="hidden sm:block overflow-hidden">
          <p className="font-semibold text-sm text-[#dce2f6] truncate">
            {currentTrack.title}
          </p>
          <p className="text-xs text-[#d0c5af]/80 truncate">{currentTrack.artist}</p>
        </div>
      </div>

      {/* Center: Controls & Progress Bar */}
      <div className="flex-1 flex flex-col items-center">
        <div className="flex items-center gap-4 md:gap-6 mb-2">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`transition-colors ${
              isShuffle ? 'text-[#f2ca50]' : 'text-[#d0c5af] hover:text-[#f2ca50]'
            }`}
            title="Shuffle"
          >
            <span className="material-symbols-outlined text-xl">shuffle</span>
          </button>

          <button
            onClick={onPrevTrack}
            className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors"
            title="Previous Track"
          >
            <span className="material-symbols-outlined text-2xl">skip_previous</span>
          </button>

          <button
            onClick={onTogglePlay}
            className="w-11 h-11 bg-[#f2ca50] text-[#3c2f00] rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg gold-glow font-bold"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>

          <button
            onClick={onNextTrack}
            className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors"
            title="Next Track"
          >
            <span className="material-symbols-outlined text-2xl">skip_next</span>
          </button>

          <button
            onClick={() => setIsRepeat(!isRepeat)}
            className={`transition-colors ${
              isRepeat ? 'text-[#f2ca50]' : 'text-[#d0c5af] hover:text-[#f2ca50]'
            }`}
            title="Repeat"
          >
            <span className="material-symbols-outlined text-xl">repeat</span>
          </button>
        </div>

        {/* Progress Slider */}
        <div className="w-full max-w-xl flex items-center gap-3">
          <span className="text-xs text-[#d0c5af]/60 font-mono">
            {formatTime(progress)}
          </span>
          <div
            className="h-1.5 flex-1 bg-white/10 rounded-full relative group cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const newPct = clickX / rect.width;
              setProgress(Math.floor(newPct * totalSeconds));
            }}
          >
            <div
              className="absolute h-full bg-[#f2ca50] rounded-full transition-all"
              style={{ width: `${percent}%` }}
            />
            <div
              className="absolute h-3 w-3 bg-[#f2ca50] rounded-full -top-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              style={{ left: `${percent}%`, marginLeft: '-6px' }}
            />
          </div>
          <span className="text-xs text-[#d0c5af]/60 font-mono">
            {currentTrack.duration}
          </span>
        </div>
      </div>

      {/* Right: Volume & Fullscreen */}
      <div className="w-1/4 min-w-[140px] flex items-center justify-end gap-3 md:gap-4">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors"
        >
          <span className="material-symbols-outlined text-xl">
            {isMuted || volume === 0 ? 'volume_off' : 'volume_up'}
          </span>
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            setVolume(parseFloat(e.target.value));
            setIsMuted(false);
          }}
          className="w-16 md:w-24 accent-[#f2ca50] cursor-pointer"
        />

        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }}
          className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors hidden sm:block"
          title="Fullscreen"
        >
          <span className="material-symbols-outlined text-xl">fullscreen</span>
        </button>
      </div>
    </div>
  );
};
