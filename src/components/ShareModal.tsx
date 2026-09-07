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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="share-modal"
        className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-md shadow-2xl border border-stone-200/80 dark:border-stone-800 overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base">Partager cet article</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Article preview preview */}
          <div className="p-3 bg-stone-50 dark:bg-stone-850 rounded-xl border border-stone-200 dark:border-stone-750 flex gap-3 items-center">
            {article.coverImage && (
              <img
                src={article.coverImage}
                alt=""
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-lg object-cover shrink-0 border border-stone-200 dark:border-stone-700"
              />
            )}
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {article.categoryName}
              </span>
              <p className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                {article.title}
              </p>
            </div>
          </div>

          {/* Native Web Share Button (if available) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
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
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
              Lien direct vers l'actualité
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 text-xs bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-200 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  copied
                    ? 'bg-emerald-700 dark:bg-emerald-600 text-white shadow-xs'
                    : 'bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900'
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
