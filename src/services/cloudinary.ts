import { CloudinaryMedia, MediaRecord, MediaUsageType } from '../types';
import { api } from './api';

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'thumb' | 'scale' | 'limit';
  gravity?: 'face' | 'center' | 'auto' | 'north' | 'south';
  quality?: 'auto' | 'auto:good' | 'auto:eco' | 'auto:best' | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  radius?: 'max' | number;
}

// 1. Image and Video File Validation with comprehensive feedback in French
export function validateMediaFile(
  file: File,
  type: 'image' | 'video' = 'image'
): { isValid: boolean; error?: string } {
  const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/quicktime'];

  const maxImageSize = 10 * 1024 * 1024; // 10 MB
  const maxVideoSize = 60 * 1024 * 1024; // 60 MB

  if (type === 'image') {
    // Check extension fallback if mime is missing or generic
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

    if (!allowedImageMimes.includes(file.type) && (!ext || !validExts.includes(ext))) {
      return {
        isValid: false,
        error: 'Format d’image non supporté. Formats acceptés : JPG, JPEG, PNG, WEBP, GIF.',
      };
    }
    if (file.size > maxImageSize) {
      return {
        isValid: false,
        error: `L’image est trop volumineuse (${(file.size / (1024 * 1024)).toFixed(1)} Mo). La taille maximale autorisée est de 10 Mo.`,
      };
    }
  } else if (type === 'video') {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['mp4', 'webm', 'mov'];

    if (!allowedVideoMimes.includes(file.type) && (!ext || !validExts.includes(ext))) {
      return {
        isValid: false,
        error: 'Format vidéo non supporté. Formats acceptés : MP4, WebM ou MOV (QuickTime).',
      };
    }
    if (file.size > maxVideoSize) {
      return {
        isValid: false,
        error: `La vidéo est trop volumineuse (${(file.size / (1024 * 1024)).toFixed(1)} Mo). La taille maximale autorisée est de 60 Mo.`,
      };
    }
  }

  return { isValid: true };
}

// Helper to convert File to Base64 data URL with optional progress callback
export function fileToBase64(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (onProgress) {
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 50);
          onProgress(percent);
        }
      };
    }

    reader.onload = () => {
      if (onProgress) onProgress(60);
      resolve(reader.result as string);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// 2. Upload file securely via server backend
export async function uploadMediaToCloudinary(
  file: File,
  options: {
    type?: 'image' | 'video';
    usageType?: MediaUsageType;
    folder?: string;
    altText?: string;
    caption?: string;
    articleId?: string;
    onProgress?: (percent: number) => void;
  } = {}
): Promise<CloudinaryMedia> {
  const mediaType = options.type || (file.type.startsWith('video/') ? 'video' : 'image');

  // Validate before sending
  const validation = validateMediaFile(file, mediaType);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  if (options.onProgress) options.onProgress(15);
  const base64Data = await fileToBase64(file, options.onProgress);

  if (options.onProgress) options.onProgress(70);

  // Send to backend route /api/media/upload
  const response = await api.request<{
    success: boolean;
    media: CloudinaryMedia;
    mediaRecord?: MediaRecord;
    warning?: string;
  }>('/api/media/upload', {
    method: 'POST',
    body: JSON.stringify({
      file: base64Data,
      type: mediaType,
      usageType: options.usageType || 'general',
      folder: options.folder,
      altText: options.altText,
      caption: options.caption,
      articleId: options.articleId,
    }),
  });

  if (options.onProgress) options.onProgress(100);

  return response.media;
}

// 3. Delete media securely from Cloudinary with orphan check
export async function deleteMediaFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'video' = 'image',
  force: boolean = false
): Promise<{ success: boolean; message: string }> {
  return await api.request<{ success: boolean; message: string }>(
    `/api/media/${encodeURIComponent(publicId)}?resourceType=${resourceType}${force ? '&force=true' : ''}`,
    {
      method: 'DELETE',
    }
  );
}

// 4. Fetch list of uploaded media records
export async function fetchMediaRecords(params?: {
  type?: string;
  usageType?: string;
  articleId?: string;
}): Promise<MediaRecord[]> {
  const query = new URLSearchParams();
  if (params?.type) query.append('type', params.type);
  if (params?.usageType) query.append('usageType', params.usageType);
  if (params?.articleId) query.append('articleId', params.articleId);

  const res = await api.request<{ mediaRecords: MediaRecord[]; total: number }>(
    `/api/media?${query.toString()}`
  );
  return res.mediaRecords || [];
}

// 5. Optimize Cloudinary Delivery URL
export function getOptimizedImageUrl(
  url: string | undefined,
  options: ImageOptimizationOptions = {}
): string {
  if (!url) return '';

  // If already an unsplash or external static image, return as is
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  const {
    width,
    height,
    crop = 'fill',
    gravity = 'auto',
    quality = 'auto',
    format = 'auto',
    radius,
  } = options;

  const transformations: string[] = [`f_${format}`, `q_${quality}`];

  if (crop) transformations.push(`c_${crop}`);
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (gravity && crop !== 'limit' && crop !== 'scale') {
    transformations.push(`g_${gravity}`);
  }
  if (radius) {
    transformations.push(`r_${radius}`);
  }

  const transformString = transformations.join(',');

  // If already transformed in path, avoid duplicating
  if (url.includes('/upload/f_auto') || url.includes('/upload/w_')) {
    return url;
  }

  // Insert transformation after /upload/
  return url.replace('/upload/', `/upload/${transformString}/`);
}

// Preset: Square Thumbnail for cards and list items
export function getThumbnailUrl(url: string | undefined, size = 200): string {
  return getOptimizedImageUrl(url, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
  });
}

// Preset: Avatar with facial recognition cropping
export function getAvatarUrl(url: string | undefined, size = 150): string {
  return getOptimizedImageUrl(url, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
  });
}

// Preset: Wide Cover banner
export function getCoverUrl(url: string | undefined, width = 1200, height = 500): string {
  return getOptimizedImageUrl(url, {
    width,
    height,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
  });
}

// Preset: Responsive article content image
export function getArticleDetailImageUrl(url: string | undefined, width = 1200): string {
  return getOptimizedImageUrl(url, {
    width,
    crop: 'limit',
    quality: 'auto',
  });
}

// Preset: Video thumbnail generation
export function getVideoThumbnailUrl(url: string | undefined): string {
  if (!url) return '';
  if (!url.includes('cloudinary.com')) {
    return 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80';
  }
  // Cloudinary generates poster frame by changing file extension to .jpg
  return url.replace(/\.[^/.]+$/, '.jpg');
}

// Preset: Format byte count to human-readable size
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes <= 0) return '0 Ko';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i] || 'Mo'}`;
}
