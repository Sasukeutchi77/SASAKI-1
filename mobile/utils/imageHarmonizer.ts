/**
 * Utility to identify real imported photos and provide harmonization
 * styles (sepia/grayscale warm ink tint & vignette) in React Native.
 */

export function isRealPhotoImage(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleanUrl = url.trim().toLowerCase();
  if (!cleanUrl) return false;

  // Dedicated anime and manga illustrations
  if (
    cleanUrl.includes('anime_') ||
    cleanUrl.includes('manga_') ||
    cleanUrl.includes('/assets/images/anime') ||
    cleanUrl.includes('/assets/images/manga')
  ) {
    return false;
  }

  // Real photos imported via Unsplash, Cloudinary, camera, or data URLs
  if (
    cleanUrl.includes('unsplash.com') ||
    cleanUrl.includes('cloudinary.com') ||
    cleanUrl.includes('pexels.com') ||
    cleanUrl.includes('images.pexels.com') ||
    cleanUrl.startsWith('data:image/') ||
    cleanUrl.startsWith('file:') ||
    cleanUrl.startsWith('blob:') ||
    cleanUrl.includes('/uploads/') ||
    cleanUrl.startsWith('http://') ||
    cleanUrl.startsWith('https://')
  ) {
    return true;
  }

  return false;
}

/**
 * Returns tint/overlay styles for real photos to match the dark manga/anime aesthetic
 */
export const mangaHarmonizerStyles = {
  // Vignette and warm sepia ink overlay for real photos in React Native
  realPhotoOverlay: {
    ...({
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.35)', // Dark obsidian & subtle slate tint
    }),
  },
  realPhotoSepiaTint: {
    ...({
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(40, 25, 10, 0.20)', // Subtle warm manga sepia ink wash
    }),
  },
};
