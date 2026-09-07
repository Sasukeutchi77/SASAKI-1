import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle, Send, Globe } from 'lucide-react';
import { Article } from '../types';

interface ShareModalProps {
  article: Article;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ article, onClose }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/#article-${article.id}`;
  const shareTitle = article.title;
  const shareText = article.summary || article.title;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        onClose();
      } catch {
        // User cancelled or share failed
      }
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-emerald-500 hover:bg-emerald-600 text-white',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle} - purge-info\n${shareUrl}`)}`,
    },
    {
      name: 'Facebook',
      icon: Globe,
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'X (Twitter)',
      icon: Share2,
      color: 'bg-black hover:bg-stone-800 text-white',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'bg-sky-500 hover:bg-sky-600 text-white',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="share-modal"
        className="bg-[#0b0e1a] rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(0,243,255,0.25)] border border-cyan-500/40 overflow-hidden transition-colors font-mono text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#101428] border-b border-cyan-500/30 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_10px_rgba(0,243,255,0.3)]">
              <Share2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base">Partager cet article</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-cyan-400/60 hover:text-cyan-200 hover:bg-cyan-500/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Article preview preview */}
          <div className="p-3 bg-[#101428] rounded-xl border border-cyan-500/30 flex gap-3 items-center">
            {article.coverImage && (
              <img
                src={article.coverImage}
                alt=""
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-lg object-cover shrink-0 border border-cyan-500/40"
              />
            )}
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                {article.categoryName}
              </span>
              <p className="font-bold text-xs sm:text-sm text-slate-100 line-clamp-2 leading-snug">
                {article.title}
              </p>
            </div>
          </div>

          {/* Native Web Share Button (if available) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 hover:brightness-110 text-black font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Partager via les applications de mon appareil</span>
            </button>
          )}

          {/* Social Platforms Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {shareOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <a
                  key={opt.name}
                  href={opt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2.5 p-3 rounded-xl font-semibold text-xs transition-all shadow-xs cursor-pointer ${opt.color}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{opt.name}</span>
                </a>
              );
            })}
          </div>

          {/* Copy Link Input Bar */}
          <div>
            <label className="block text-xs font-semibold text-cyan-400 mb-1.5">
              Lien direct vers l'actualité
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 text-xs bg-[#141933] border border-cyan-500/40 rounded-xl text-cyan-200 select-all focus:outline-none shadow-[0_0_10px_rgba(0,243,255,0.1)]"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  copied
                    ? 'bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(217,70,239,0.5)]'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_10px_rgba(0,243,255,0.3)]'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
