import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { sfx } from '../services/soundEffects';

interface SoundToggleButtonProps {
  compact?: boolean;
}

export const SoundToggleButton: React.FC<SoundToggleButtonProps> = ({ compact = false }) => {
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    setEnabled(sfx.isEnabled());
  }, []);

  const handleToggle = () => {
    const nextState = !enabled;
    setEnabled(nextState);
    sfx.setEnabled(nextState);
    if (nextState) {
      sfx.playMechanicalClick();
      setTimeout(() => {
        sfx.playTerminalBeep(1200);
      }, 40);
    } else {
      sfx.playToggle();
    }
  };

  return (
    <button
      id="toggle-sfx-sound-btn"
      onClick={handleToggle}
      type="button"
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
        enabled
          ? 'bg-cyan-950/80 border-cyan-400/60 text-cyan-300 hover:border-cyan-300 shadow-[0_0_12px_rgba(0,243,255,0.25)] hover:shadow-[0_0_18px_rgba(0,243,255,0.4)]'
          : 'bg-[#0b0e1a]/80 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-500'
      }`}
      title={
        enabled
          ? "Sons d'interface Cyber & Terminal activés (Cliquer pour couper)"
          : "Sons d'interface coupés (Cliquer pour activer les bips & clics mécaniques)"
      }
    >
      {enabled ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_6px_#00f3ff]"></span>
          </span>
          <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
          <span className={compact ? 'hidden' : 'hidden sm:inline text-[11px] font-bold tracking-wider'}>
            SFX: ON
          </span>
        </>
      ) : (
        <>
          <VolumeX className="w-3.5 h-3.5 text-slate-400" />
          <span className={compact ? 'hidden' : 'hidden sm:inline text-[11px] font-bold text-slate-400'}>
            SFX: OFF
          </span>
        </>
      )}
    </button>
  );
};
