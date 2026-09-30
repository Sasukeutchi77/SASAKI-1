/**
 * Utility to identify real imported photos and apply visual harmonization
 * filters (adjusted sepia and grayscale) matching the anime/manga aesthetic.
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

  // Real photos imported via Unsplash, Cloudinary, data URLs, blobs, or external media
  if (
    cleanUrl.includes('unsplash.com') ||
    cleanUrl.includes('cloudinary.com') ||
    cleanUrl.includes('pexels.com') ||
    cleanUrl.includes('images.pexels.com') ||
    cleanUrl.startsWith('data:image/') ||
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
 * Returns the appropriate CSS classes to apply the manga/sepia/grayscale filter
 * if the image is an imported real photograph.
 */
export function getHarmonizedImageClass(url?: string | null, extraClasses: string = ''): string {
  const isReal = isRealPhotoImage(url);
  const filterClass = isReal ? 'manga-real-photo-filter' : '';
  return [filterClass, extraClasses].filter(Boolean).join(' ');
}

/**
 * Returns frame wrapper classes (vignette overlay) for real photos.
 */
export function getHarmonizedFrameClass(url?: string | null, extraClasses: string = ''): string {
  const isReal = isRealPhotoImage(url);
  const frameClass = isReal ? 'manga-photo-frame' : '';
  return [frameClass, extraClasses].filter(Boolean).join(' ');
}
