import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Images,
  Info,
} from 'lucide-react';
import { ArticleMediaItem } from '../../types';
import { getOptimizedImageUrl, getThumbnailUrl } from '../../services/cloudinary';

export interface PhotoGalleryProps {
  items: (ArticleMediaItem | string)[];
  title?: string;
  className?: string;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  items,
  title = 'Galerie photographique',
  className = '',
}) => {
  // Normalize items to ArticleMediaItem objects
  const normalizedItems: ArticleMediaItem[] = React.useMemo(() => {
    return items.map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `img_${index}`,
          url: item,
          type: 'image',
          altText: `Photo ${index + 1}`,
          order: index,
        };
      }
      return item;
    });
  }, [items]);

  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => {
    setActiveLightboxIndex(index);
  };

  const closeLightbox = () => {
    setActiveLightboxIndex(null);
  };

  const nextImage = useCallback(() => {
    if (activeLightboxIndex === null) return;
    setActiveLightboxIndex((prev) =>
      prev !== null && prev < normalizedItems.length - 1 ? prev + 1 : 0
    );
  }, [activeLightboxIndex, normalizedItems.length]);

  const prevImage = useCallback(() => {
    if (activeLightboxIndex === null) return;
    setActiveLightboxIndex((prev) =>
      prev !== null && prev > 0 ? prev - 1 : normalizedItems.length - 1
    );
  }, [activeLightboxIndex, normalizedItems.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeLightboxIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLightboxIndex, nextImage, prevImage]);

  if (!normalizedItems || normalizedItems.length === 0) {
    return null;
  }

  const currentItem = activeLightboxIndex !== null ? normalizedItems[activeLightboxIndex] : null;

  return (
    <div className={`my-6 space-y-3 ${className}`}>
      {/* Header with photo count */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Images className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          {title}
        </h4>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
          {normalizedItems.length} photos
        </span>
      </div>

      {/* Responsive Grid */}
      <div
        className={`grid gap-2 rounded-xl overflow-hidden ${
          normalizedItems.length === 1
            ? 'grid-cols-1'
            : normalizedItems.length === 2
            ? 'grid-cols-2'
            : normalizedItems.length === 3
            ? 'grid-cols-3'
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
        }`}
      >
        {normalizedItems.slice(0, 4).map((item, index) => {
          const isLastShown = index === 3 && normalizedItems.length > 4;
          const remainingCount = normalizedItems.length - 4;

          return (
            <div
              key={item.id || index}
              onClick={() => openLightbox(index)}
              className="relative group aspect-square bg-neutral-100 dark:bg-neutral-800 overflow-hidden cursor-pointer"
            >
              <img
                src={getOptimizedImageUrl(item.url, {
                  width: 500,
                  height: 500,
                  crop: 'fill',
                  quality: 'auto',
                })}
                alt={item.altText || `Photo ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />

              {/* Hover icon */}
              <div className="absolute inset-0 bg-neutral-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-white drop-shadow" />
              </div>

              {/* Overflow overlay if more than 4 photos */}
              {isLastShown && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-2 text-center">
                  <span className="text-xl font-bold">+{remainingCount}</span>
                  <span className="text-xs text-neutral-200">photos supplémentaires</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {activeLightboxIndex !== null && currentItem && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between animate-fade-in backdrop-blur-md">
          {/* Top Bar */}
          <div className="p-4 flex items-center justify-between text-white border-b border-neutral-800/80">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm px-2.5 py-1 bg-neutral-800 rounded-md">
                {activeLightboxIndex + 1} / {normalizedItems.length}
              </span>
              {currentItem.caption && (
                <span className="text-xs text-neutral-300 truncate max-w-md hidden sm:inline-block">
                  {currentItem.caption}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={closeLightbox}
              className="p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-white transition focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Fermer le plein écran"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Photo Center Container */}
          <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
            {/* Previous Arrow */}
            {normalizedItems.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-4 z-10 p-3 rounded-full bg-neutral-900/80 hover:bg-emerald-600 text-white shadow-lg transition-all focus:outline-none"
                aria-label="Photo précédente"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Display Image */}
            <div className="max-w-5xl max-h-[75vh] flex items-center justify-center">
              <img
                src={getOptimizedImageUrl(currentItem.url, {
                  width: 1600,
                  crop: 'limit',
                  quality: 'auto',
                })}
                alt={currentItem.altText || `Photo ${activeLightboxIndex + 1}`}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>

            {/* Next Arrow */}
            {normalizedItems.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 z-10 p-3 rounded-full bg-neutral-900/80 hover:bg-emerald-600 text-white shadow-lg transition-all focus:outline-none"
                aria-label="Photo suivante"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Bar: Captions & Thumbnail Strip */}
          <div className="p-4 bg-neutral-950/90 border-t border-neutral-800 space-y-3">
            {(currentItem.caption || currentItem.altText) && (
              <div className="text-center max-w-2xl mx-auto text-xs text-neutral-300">
                {currentItem.caption ? (
                  <p className="font-medium text-neutral-200">{currentItem.caption}</p>
                ) : (
                  <p className="text-neutral-400 italic">{currentItem.altText}</p>
                )}
              </div>
            )}

            {/* Thumbnail Navigation Strip */}
            {normalizedItems.length > 1 && (
              <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 max-w-xl mx-auto scrollbar-none">
                {normalizedItems.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    type="button"
                    onClick={() => setActiveLightboxIndex(idx)}
                    className={`shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                      activeLightboxIndex === idx
                        ? 'border-emerald-500 scale-105'
                        : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={getThumbnailUrl(item.url, 80)}
                      alt={`Miniature ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
