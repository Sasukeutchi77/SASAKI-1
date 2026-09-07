import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sfx } from '../services/soundEffects';

export const SoundToggleButton: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    setEnabled(sfx.isEnabled());
  }, []);

  const handleToggle = () => {
    const nextState = !enabled;
    setEnabled(nextState);
    sfx.setEnabled(nextState);
    if (nextState) {
      sfx.playSuccess();
    }
  };

  return (
    <button
      id="toggle-sfx-sound-btn"
      onClick={handleToggle}
      type="button"
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
        enabled
          ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300 hover:border-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.15)]'
          : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
      }`}
      title={enabled ? 'Sons d\'interface Cyber activés (Cliquer pour couper)' : 'Sons d\'interface coupés (Cliquer pour activer)'}
    >
      {enabled ? (
        <>
          <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="hidden sm:inline">SFX ON</span>
        </>
      ) : (
        <>
          <VolumeX className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">SFX OFF</span>
        </>
      )}
    </button>
  );
};
