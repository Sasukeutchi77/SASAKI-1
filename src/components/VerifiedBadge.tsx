import React from 'react';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  type?: 'journalist' | 'media';
  showLabel?: boolean;
  label?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  followersCount?: number;
  title?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'sm',
  type = 'journalist',
  showLabel = false,
  label,
  className = '',
  onClick,
  followersCount,
  title,
}) => {
  const sizeClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5',
    lg: 'w-5.5 h-5.5',
    xl: 'w-7 h-7',
  }[size];

  const defaultTitle =
    title ||
    (type === 'journalist'
      ? `Journaliste certifié (Badge bleu) • ${
          followersCount && followersCount >= 50
            ? `${followersCount} abonnés (seuil 50 atteint)`
            : 'Certifié par l’administration'
        }`
      : `Maison de presse certifiée (Badge bleu) • ${
          followersCount && followersCount >= 100
            ? `${followersCount} abonnés (seuil 100 atteint)`
            : 'Agrément officiel accordé'
        }`);

  const badgeIcon = (
    <span
      className={`inline-flex items-center justify-center shrink-0 select-none ${sizeClasses} ${className} ${
        onClick ? 'cursor-pointer hover:scale-110 active:scale-95' : ''
      } transition-transform`}
      title={defaultTitle}
      onClick={onClick}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-full h-full drop-shadow-[0_0_6px_rgba(0,210,255,0.7)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sorsaBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1d68ff" />
            <stop offset="100%" stopColor="#00d2ff" />
          </linearGradient>
        </defs>
        {/* Electric Blue / Cyan circular badge */}
        <circle cx="12" cy="12" r="11.5" fill="url(#sorsaBadgeGrad)" />
        {/* Crisp pure white checkmark */}
        <path
          d="M7 12.5L10.3 15.8L17.2 8.6"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );

  if (!showLabel) {
    return badgeIcon;
  }

  const defaultLabel = label || (type === 'journalist' ? 'Journaliste certifié' : 'Maison certifiée');

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[11px] font-bold shadow-[0_0_12px_rgba(0,210,255,0.25)] ${
        onClick ? 'cursor-pointer hover:bg-blue-600/30 hover:border-cyan-300' : ''
      } transition-all`}
      title={defaultTitle}
    >
      {badgeIcon}
      <span className="font-sans font-bold tracking-tight text-white">{defaultLabel}</span>
    </span>
  );
};
