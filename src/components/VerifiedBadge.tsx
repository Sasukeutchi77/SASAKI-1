import React from 'react';

export type VerifiedBadgeType = 'journalist' | 'media' | 'admin' | 'citizen';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  type?: VerifiedBadgeType;
  isVerified?: boolean;
  role?: string;
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
  isVerified = true,
  role,
  showLabel = false,
  label,
  className = '',
  onClick,
  followersCount,
  title,
}) => {
  // If explicitly not verified, do not display
  if (!isVerified) {
    return null;
  }

  // Derive effective type based on role or prop
  const effectiveType: VerifiedBadgeType =
    role === 'admin'
      ? 'admin'
      : role === 'journalist' || role === 'journaliste'
      ? 'journalist'
      : type === 'media'
      ? 'media'
      : role === 'user' || role === 'citoyen' || role === 'reader' || type === 'citizen'
      ? 'citizen'
      : type || 'journalist';

  const sizeClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5',
    lg: 'w-5.5 h-5.5',
    xl: 'w-7 h-7',
  }[size];

  // Specific color themes per certification category
  const themeConfig = {
    admin: {
      gradStart: '#eab308',
      gradEnd: '#00d2ff',
      glow: 'rgba(234, 179, 8, 0.65)',
      pillBg: 'from-amber-500/20 to-cyan-500/20',
      pillBorder: 'border-amber-400/50',
      pillText: 'text-amber-300',
      defaultTitle: `Administrateur Officiel Certifié (Badge Or & Cyan) • ${
        followersCount && followersCount > 0 ? `${followersCount} abonnés` : 'Gestion système'
      }`,
      defaultLabel: 'Admin certifié',
    },
    journalist: {
      gradStart: '#1d68ff',
      gradEnd: '#00d2ff',
      glow: 'rgba(0, 210, 255, 0.7)',
      pillBg: 'from-blue-600/20 to-cyan-500/20',
      pillBorder: 'border-cyan-400/50',
      pillText: 'text-cyan-300',
      defaultTitle: `Journaliste Certifié (Badge Bleu Officiel) • ${
        followersCount && followersCount >= 50
          ? `${followersCount} abonnés (seuil 50 atteint)`
          : 'Accréditation de presse confirmée'
      }`,
      defaultLabel: 'Journaliste certifié',
    },
    media: {
      gradStart: '#2563eb',
      gradEnd: '#38bdf8',
      glow: 'rgba(37, 99, 235, 0.65)',
      pillBg: 'from-blue-700/20 to-sky-500/20',
      pillBorder: 'border-blue-400/50',
      pillText: 'text-sky-300',
      defaultTitle: `Maison de Presse Certifiée (Agrément Officiel) • ${
        followersCount && followersCount >= 100
          ? `${followersCount} abonnés (seuil 100 atteint)`
          : 'Rédaction agréée'
      }`,
      defaultLabel: 'Maison certifiée',
    },
    citizen: {
      gradStart: '#10b981',
      gradEnd: '#06b6d4',
      glow: 'rgba(16, 185, 129, 0.65)',
      pillBg: 'from-emerald-600/20 to-cyan-500/20',
      pillBorder: 'border-emerald-400/50',
      pillText: 'text-emerald-300',
      defaultTitle: `Citoyen Vérifié & Accrédité • Profil authentifié auprès de la communauté`,
      defaultLabel: 'Citoyen vérifié',
    },
  }[effectiveType];

  const defaultTitle = title || themeConfig.defaultTitle;
  const defaultLabel = label || themeConfig.defaultLabel;

  const gradientId = `badgeGrad_${effectiveType}_${size}`;

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
        style={{ filter: `drop-shadow(0 0 6px ${themeConfig.glow})` }}
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={themeConfig.gradStart} />
            <stop offset="100%" stopColor={themeConfig.gradEnd} />
          </linearGradient>
        </defs>
        {/* Glowing badge circle */}
        <circle cx="12" cy="12" r="11.5" fill={`url(#${gradientId})`} />
        {/* Crisp checkmark */}
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

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r ${themeConfig.pillBg} border ${themeConfig.pillBorder} ${themeConfig.pillText} text-[11px] font-bold shadow-[0_0_12px_rgba(0,210,255,0.25)] ${
        onClick ? 'cursor-pointer hover:bg-opacity-80' : ''
      } transition-all`}
      title={defaultTitle}
    >
      {badgeIcon}
      <span className="font-sans font-bold tracking-tight text-white">{defaultLabel}</span>
    </span>
  );
};
