import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Send,
  Save,
  Sparkles,
  Images,
  Video as VideoIcon,
  HelpCircle,
} from 'lucide-react';
import { Category, Article, CloudinaryMedia, ArticleMediaItem } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MediaUploader } from './media/MediaUploader';
import { VideoPlayer } from './media/VideoPlayer';

interface CreateArticleModalProps {
  categories: Category[];
  onClose: () => void;
  onArticleCreated: (article: Article) => void;
  articleToEdit?: Article | null;
}

const PRESET_IMAGES = [
  { label: 'Industrie & Énergie', url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80', alt: 'Centrale solaire photovoltaïque et transition énergétique au Burkina Faso' },
  { label: 'Culture & FESPACO', url: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1000&auto=format&fit=crop&q=80', alt: 'Célébration culturelle du cinéma africain à Ouagadougou' },
  { label: 'Agriculture & Sahel', url: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=1000&auto=format&fit=crop&q=80', alt: 'Agriculture sahélienne et développement rural' },
  { label: 'Sport & Étalons', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1000&auto=format&fit=crop&q=80', alt: 'Match officiel et ferveur sportive' },
  { label: 'Numérique & Économie', url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1000&auto=format&fit=crop&q=80', alt: 'Croissance économique et fintech' },
];

export const CreateArticleModal: React.FC<CreateArticleModalProps> = ({
  categories,
  onClose,
  onArticleCreated,
  articleToEdit,
}) => {
  const { user } = useAuth();

  // Basic article fields
  const [title, setTitle] = useState(articleToEdit ? articleToEdit.title : '');
  const [summary, setSummary] = useState(articleToEdit ? articleToEdit.summary : '');
  const [content, setContent] = useState(articleToEdit ? articleToEdit.content : '');
  const [categoryId, setCategoryId] = useState(
    articleToEdit ? articleToEdit.categoryId : categories[0]?.id || ''
  );
  const [status, setStatus] = useState<'published' | 'draft'>(
    articleToEdit ? (articleToEdit.status as 'published' | 'draft') : 'published'
  );
  const [tagsInput, setTagsInput] = useState(
    articleToEdit ? articleToEdit.tags.join(', ') : ''
  );

  // Media: Cover
  const [coverImage, setCoverImage] = useState(
    articleToEdit ? articleToEdit.coverImage : PRESET_IMAGES[0].url
  );
  const [coverImageAlt, setCoverImageAlt] = useState(
    articleToEdit ? articleToEdit.coverImageAlt || '' : PRESET_IMAGES[0].alt
  );
  const [coverMedia, setCoverMedia] = useState<CloudinaryMedia | undefined>(
    articleToEdit?.coverMedia
  );

  // Media: Photo Gallery
  const [gallery, setGallery] = useState<ArticleMediaItem[]>(
    articleToEdit?.gallery ||
      (articleToEdit?.images
        ? articleToEdit.images.map((img, idx) => ({
            id: `gal_${idx}`,
            url: img,
            type: 'image',
            altText: `Photo ${idx + 1}`,
            order: idx,
          }))
        : [])
  );
  const [isAddingGalleryPhoto, setIsAddingGalleryPhoto] = useState(false);

  // Media: Video
  const [videoUrl, setVideoUrl] = useState<string | undefined>(
    articleToEdit?.videoUrl || undefined
  );
  const [videoMedia, setVideoMedia] = useState<CloudinaryMedia | undefined>(
    articleToEdit?.videoMedia
  );
  const [videoThumbnail, setVideoThumbnail] = useState<string | undefined>(
    articleToEdit?.videoThumbnail || undefined
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  // Gallery manipulation
  const handleAddGalleryItem = (media: CloudinaryMedia, altText?: string, caption?: string) => {
    const newItem: ArticleMediaItem = {
      id: `gal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      url: media.url,
      publicId: media.publicId,
      type: 'image',
      altText: altText || '',
      caption: caption || '',
      order: gallery.length,
    };
    setGallery([...gallery, newItem]);
    setIsAddingGalleryPhoto(false);
  };

  const handleRemoveGalleryItem = (index: number) => {
    setGallery(gallery.filter((_, idx) => idx !== index));
  };

  const handleUpdateGalleryItemCaption = (index: number, caption: string) => {
    setGallery(
      gallery.map((item, idx) => (idx === index ? { ...item, caption } : item))
    );
  };

  const handleUpdateGalleryItemAlt = (index: number, altText: string) => {
    setGallery(
      gallery.map((item, idx) => (idx === index ? { ...item, altText } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) {
      setError('Veuillez renseigner au minimum le titre, la catégorie et le contenu.');
      return;
    }

    setLoading(true);
    setError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const flatImages = gallery.map((g) => g.url);

    try {
      const payload = {
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        categoryId,
        tags,
        coverImage,
        coverImageAlt: coverImageAlt.trim() || undefined,
        coverMedia,
        images: flatImages,
        gallery,
        videoUrl: videoUrl || undefined,
        videoMedia,
        videoThumbnail,
        status,
      };

      if (articleToEdit) {
        const res = await api.updateArticle(articleToEdit.id, payload);
        onArticleCreated(res.article);
      } else {
        const res = await api.createArticle(payload);
        onArticleCreated(res.article);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l’enregistrement de l’article.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-4 max-h-[92vh] border border-neutral-200 dark:border-neutral-800">
        {/* Header */}
        <div className="bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black text-neutral-900 dark:text-neutral-100">
              {articleToEdit ? 'Modifier l’article' : 'Rédiger et publier un article'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Système de rédaction professionnel — {user?.mediaName || user?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Titre de l’article *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Conférence sur l'agroécologie : Ouagadougou accueille les délégations de l'AES"
              className="w-full px-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-neutral-900 dark:text-neutral-100"
            />
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Rubrique / Catégorie *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-neutral-100"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Statut de publication
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-neutral-100"
              >
                <option value="published">Publier immédiatement</option>
                <option value="draft">Enregistrer comme brouillon</option>
              </select>
            </div>
          </div>

          {/* Summary / Chapô */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Résumé / Chapô
            </label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Une à deux phrases résumant l'angle essentiel de l'information..."
              className="w-full px-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-neutral-800 dark:text-neutral-200"
            />
          </div>

          {/* Main Content */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Corps du texte / Contenu de l’article *
            </label>
            <textarea
              rows={7}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Rédigez ici votre reportage, enquête ou analyse détaillée..."
              className="w-full px-4 py-3 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed text-neutral-900 dark:text-neutral-100"
            />
          </div>

          {/* SECTION 1: COVER IMAGE VIA MEDIA UPLOADER */}
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                  1. Image de couverture (Principale)
                </h3>
                <p className="text-xs text-neutral-500">
                  Cette image sera optimisée automatiquement (compression, WebP/AVIF, miniatures).
                </p>
              </div>
            </div>

            <MediaUploader
              type="image"
              usageType="article_cover"
              value={coverImage}
              altText={coverImageAlt}
              aspectRatio="16/9"
              showAltInput={true}
              onChange={(media, alt) => {
                setCoverImage(media.url);
                setCoverMedia(media);
                if (alt) setCoverImageAlt(alt);
              }}
              onAltChange={(alt) => setCoverImageAlt(alt)}
              onRemove={() => {
                setCoverImage(PRESET_IMAGES[0].url);
                setCoverImageAlt(PRESET_IMAGES[0].alt);
                setCoverMedia(undefined);
              }}
            />

            {/* Presets shortcut */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2">
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Suggestions de visuels :
              </span>
              {PRESET_IMAGES.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setCoverImage(p.url);
                    setCoverImageAlt(p.alt);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                    coverImage === p.url
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold'
                      : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 2: PHOTO GALLERY */}
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Images className="w-4 h-4 text-emerald-600" />
                  2. Galerie photo (Reportage / Enquête)
                </h3>
                <p className="text-xs text-neutral-500">
                  Ajoutez plusieurs clichés avec légendes pour enrichir votre reportage.
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300">
                {gallery.length} photo{gallery.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* List of current gallery items */}
            {gallery.length > 0 && (
              <div className="space-y-3">
                {gallery.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700"
                  >
                    <img
                      src={item.url}
                      alt={item.altText || `Photo ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-lg shrink-0 border border-neutral-200 dark:border-neutral-700"
                    />

                    <div className="flex-1 w-full space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={item.caption || ''}
                          onChange={(e) => handleUpdateGalleryItemCaption(idx, e.target.value)}
                          placeholder="Légende de la photo..."
                          className="w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100"
                        />
                        <input
                          type="text"
                          value={item.altText || ''}
                          onChange={(e) => handleUpdateGalleryItemAlt(idx, e.target.value)}
                          placeholder="Texte alt (accessibilité)..."
                          className="w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryItem(idx)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition shrink-0"
                      title="Supprimer cette photo de la galerie"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new gallery photo toggle */}
            {!isAddingGalleryPhoto ? (
              <button
                type="button"
                onClick={() => setIsAddingGalleryPhoto(true)}
                className="w-full py-2.5 border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-600 dark:hover:border-emerald-500 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                Ajouter une photo à la galerie
              </button>
            ) : (
              <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-emerald-300 dark:border-emerald-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                    Sélectionner ou téléverser une photo
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingGalleryPhoto(false)}
                    className="text-neutral-400 hover:text-neutral-600 text-xs"
                  >
                    Annuler
                  </button>
                </div>

                <MediaUploader
                  type="image"
                  usageType="article_gallery"
                  showAltInput={true}
                  showCaptionInput={true}
                  onChange={(media, alt, cap) => {
                    handleAddGalleryItem(media, alt, cap);
                  }}
                />
              </div>
            )}
          </div>

          {/* SECTION 3: VIDEO ATTACHMENT */}
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <VideoIcon className="w-4 h-4 text-emerald-600" />
                  3. Reportage Vidéo (Optionnel)
                </h3>
                <p className="text-xs text-neutral-500">
                  Ajoutez un enregistrement vidéo ou une interview via Cloudinary (MP4, WebM, max. 60 Mo).
                </p>
              </div>
              {videoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setVideoUrl(undefined);
                    setVideoMedia(undefined);
                    setVideoThumbnail(undefined);
                  }}
                  className="text-xs text-red-600 hover:underline"
                >
                  Supprimer la vidéo
                </button>
              )}
            </div>

            {videoUrl ? (
              <div className="space-y-2">
                <VideoPlayer src={videoUrl} poster={videoThumbnail} title={title} />
                <p className="text-[11px] text-neutral-500">
                  Aperçu du lecteur vidéo tel qu'il apparaîtra dans l'article.
                </p>
              </div>
            ) : (
              <MediaUploader
                type="video"
                usageType="article_video"
                maxSizeMB={60}
                aspectRatio="16/9"
                onChange={(media) => {
                  setVideoUrl(media.url);
                  setVideoMedia(media);
                  setVideoThumbnail(media.thumbnailUrl);
                }}
              />
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Tags / Mots-clés (séparés par des virgules)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Burkina Faso, Économie, Sahel, Ouagadougou, AES"
              className="w-full px-4 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-neutral-100"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {status === 'published' ? <Send className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>
                {loading
                  ? 'Enregistrement...'
                  : articleToEdit
                  ? 'Mettre à jour'
                  : status === 'published'
                  ? 'Publier l’article'
                  : 'Enregistrer le brouillon'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
