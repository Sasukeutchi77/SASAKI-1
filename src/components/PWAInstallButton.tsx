import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);

  // Hide if already installed as standalone app or not installable
  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await install();
    } finally {
      setInstalling(false);
    }
  };

  if (compact) {
    return (
      <button
        id="pwa-install-compact-btn"
        onClick={handleInstall}
        disabled={installing}
        className="p-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(0,210,255,0.4)] hover:shadow-[0_0_20px_rgba(0,210,255,0.7)] transition-all cursor-pointer flex items-center justify-center"
        title="Installer l'application PURGE sur votre appareil Android"
      >
        <Download className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      id="pwa-install-btn"
      onClick={handleInstall}
      disabled={installing}
      className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 text-white text-xs font-bold shadow-[0_0_15px_rgba(0,210,255,0.4)] hover:shadow-[0_0_25px_rgba(0,210,255,0.8)] transition-all cursor-pointer border border-white/20 hover:scale-[1.02] active:scale-[0.98]"
      title="Installer l'application PURGE sur votre appareil Android"
    >
      <Smartphone className="w-3.5 h-3.5 text-cyan-200" />
      <span>Installer l'App Android</span>
    </button>
  );
};
