import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
} from 'lucide-react';
import { CloudinaryMedia, MediaUsageType } from '../../types';
import { uploadMediaToCloudinary, validateMediaFile, getOptimizedImageUrl } from '../../services/cloudinary';

export interface MediaUploaderProps {
  type?: 'image' | 'video';
  usageType?: MediaUsageType;
  value?: string;
  publicId?: string;
  altText?: string;
  caption?: string;
  onChange: (media: CloudinaryMedia, altText?: string, caption?: string) => void;
  onRemove?: () => void;
  onAltChange?: (altText: string) => void;
  onCaptionChange?: (caption: string) => void;
  label?: string;
  description?: string;
  maxSizeMB?: number;
  aspectRatio?: '1/1' | '16/9' | '21/9' | '4/3' | 'auto';
  showAltInput?: boolean;
  showCaptionInput?: boolean;
  disabled?: boolean;
  className?: string;
  folder?: string;
  articleId?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  type = 'image',
  usageType = 'general',
  value,
  publicId,
  altText = '',
  caption = '',
  onChange,
  onRemove,
  onAltChange,
  onCaptionChange,
  label,
  description,
  maxSizeMB = type === 'video' ? 60 : 10,
  aspectRatio = 'auto',
  showAltInput = type === 'image',
  showCaptionInput = false,
  disabled = false,
  className = '',
  folder,
  articleId,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal preview when value prop changes externally
  React.useEffect(() => {
    setPreviewUrl(value || null);
  }, [value]);

  const handleFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);

      // Validate
      const targetType: 'image' | 'video' = type === 'video' ? 'video' : 'image';
      const targetUsage: MediaUsageType = (usageType as MediaUsageType) || 'general';

      const validation = validateMediaFile(file, targetType);
      if (!validation.isValid) {
        setErrorMessage(validation.error || 'Fichier non valide.');
        return;
      }

      // Generate instant local preview
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      setIsUploading(true);
      setUploadProgress(10);

      try {
        const media = await uploadMediaToCloudinary(file, {
          type: targetType,
          usageType: targetUsage,
          folder,
          altText,
          caption,
          articleId,
          onProgress: (p) => setUploadProgress(p),
        });

        setPreviewUrl(media.url);
        onChange(media, altText, caption);
      } catch (err: any) {
        console.error('Erreur téléversement média:', err);
        setErrorMessage(err.message || 'Échec du téléversement du média.');
        setPreviewUrl(value || null);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [type, usageType, folder, altText, caption, articleId, onChange, value]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || isUploading) return;
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    setErrorMessage(null);
    if (onRemove) {
      onRemove();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getAspectClass = () => {
    switch (aspectRatio) {
      case '1/1':
        return 'aspect-square';
      case '16/9':
        return 'aspect-video';
      case '21/9':
        return 'aspect-[21/9]';
      case '4/3':
        return 'aspect-[4/3]';
      default:
        return 'min-h-[160px]';
    }
  };

  const acceptedMimes =
    type === 'video'
      ? 'video/mp4,video/webm,video/quicktime'
      : 'image/jpeg,image/png,image/webp,image/gif';

  return (
    <div className={`w-full space-y-2.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {label}
          </label>
          {description && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {description}
            </span>
          )}
        </div>
      )}

      {/* Upload Zone / Preview */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${getAspectClass()} ${
          isDragging
            ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-4 ring-emerald-500/20'
            : previewUrl
            ? 'border-neutral-300 dark:border-neutral-700 bg-neutral-900'
            : 'border-neutral-300 dark:border-neutral-700 hover:border-emerald-600 dark:hover:border-emerald-500 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100/80 dark:hover:bg-neutral-800'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedMimes}
          onChange={handleInputChange}
          disabled={disabled || isUploading}
          className="hidden"
          id={`media-uploader-input-${label || usageType}`}
        />

        {previewUrl ? (
          <div className="relative w-full h-full flex items-center justify-center group">
            {type === 'video' ? (
              <video
                src={previewUrl}
                className="w-full h-full object-cover"
                controls={false}
                playsInline
                muted
              />
            ) : (
              <img
                src={getOptimizedImageUrl(previewUrl, { quality: 'auto', format: 'auto' })}
                alt={altText || 'Aperçu du média'}
                className="w-full h-full object-cover"
              />
            )}

            {/* Hover overlay with action buttons */}
            <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-3 py-1.5 bg-white/90 dark:bg-neutral-800/90 text-neutral-800 dark:text-white rounded-lg text-xs font-semibold shadow hover:bg-white flex items-center gap-1.5 transition"
                title="Remplacer le fichier"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Remplacer
              </button>

              {onRemove && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-xs font-semibold shadow flex items-center gap-1.5 transition"
                  title="Supprimer ce média"
                >
                  <X className="w-3.5 h-3.5" />
                  Retirer
                </button>
              )}
            </div>

            {/* Success badge */}
            <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-600 text-white text-[11px] font-semibold rounded-md flex items-center gap-1 shadow">
              <CheckCircle2 className="w-3 h-3" />
              {type === 'video' ? 'Vidéo prête' : 'Image prête'}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 mb-3 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              {type === 'video' ? (
                <VideoIcon className="w-6 h-6" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
              Glissez-déposez votre {type === 'video' ? 'vidéo' : 'image'} ici, ou{' '}
              <span className="text-emerald-600 dark:text-emerald-400 underline">
                parcourez
              </span>
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {type === 'video'
                ? `Formats acceptés : MP4, WebM, MOV (max. ${maxSizeMB} Mo)`
                : `Formats acceptés : JPG, PNG, WebP, GIF (max. ${maxSizeMB} Mo)`}
            </p>
          </div>
        )}

        {/* Uploading progress overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-10">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold text-white mb-2">
              Téléversement vers Cloudinary... {uploadProgress}%
            </p>
            <div className="w-48 bg-neutral-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800 dark:hover:text-red-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Alt Text (Accessibility) Field */}
      {showAltInput && previewUrl && (
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-neutral-500" />
              Texte alternatif (accessibilité & SEO)
            </label>
            <span className="text-[10px] text-neutral-400">Recommandé</span>
          </div>
          <input
            type="text"
            value={altText}
            onChange={(e) => onAltChange && onAltChange(e.target.value)}
            placeholder="Décrivez brièvement le contenu de l'image..."
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}

      {/* Caption Field (for galleries) */}
      {showCaptionInput && previewUrl && (
        <div className="space-y-1 pt-1">
          <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-neutral-500" />
            Légende / Crédits photo
          </label>
          <input
            type="text"
            value={caption}
            onChange={(e) => onCaptionChange && onCaptionChange(e.target.value)}
            placeholder="Ex : Photo d'archives purge-info - Ouagadougou 2026"
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}
    </div>
  );
};
