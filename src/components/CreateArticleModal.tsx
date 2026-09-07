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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0b0e1a] rounded-2xl shadow-[0_0_50px_rgba(0,243,255,0.25)] overflow-hidden flex flex-col my-4 max-h-[92vh] border border-cyan-500/40 text-slate-100 transition-all font-mono">
        {/* Header */}
        <div className="bg-[#101428] border-b border-cyan-500/30 px-6 py-4 flex items-center justify-between shrink-0 font-mono">
          <div>
            <h2 className="text-lg font-black text-white">
              {articleToEdit ? 'Modifier l’article' : 'Rédiger et publier un article'}
            </h2>
            <p className="text-xs text-cyan-400/70">
              Système de rédaction professionnel — {user?.mediaName || user?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-cyan-400/60 hover:text-cyan-200 hover:bg-cyan-500/20 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-500/40 text-red-300 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
              Titre de l’article *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Conférence sur l'agroécologie : Ouagadougou accueille les délégations de l'AES"
              className="w-full px-4 py-2.5 text-sm bg-[#141933] border border-cyan-500/40 rounded-xl focus:outline-none focus:border-cyan-400 font-semibold text-white shadow-[0_0_10px_rgba(0,243,255,0.1)]"
            />
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                Rubrique / Catégorie *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-[#141933] border border-cyan-500/40 rounded-xl focus:outline-none focus:border-cyan-400 text-white shadow-[0_0_10px_rgba(0,243,255,0.1)]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#101428] text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                Statut de publication
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2.5 text-sm bg-[#141933] border border-cyan-500/40 rounded-xl focus:outline-none focus:border-cyan-400 text-white shadow-[0_0_10px_rgba(0,243,255,0.1)]"
              >
                <option value="published" className="bg-[#101428] text-white">Publier immédiatement</option>
                <option value="draft" className="bg-[#101428] text-white">Enregistrer comme brouillon</option>
              </select>
            </div>
          </div>

          {/* Summary / Chapô */}
          <div>
            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
              Résumé / Chapô
            </label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Une à deux phrases résumant l'angle essentiel de l'information..."
              className="w-full px-4 py-2.5 text-sm bg-[#141933] border border-cyan-500/40 rounded-xl focus:outline-none focus:border-cyan-400 resize-none text-slate-200 shadow-[0_0_10px_rgba(0,243,255,0.1)]"
            />
          </div>

          {/* Main Content */}
          <div>
            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
              Corps du texte / Contenu de l’article *
            </label>
            <textarea
              rows={7}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Rédigez ici votre reportage, enquête ou analyse détaillée..."
              className="w-full px-4 py-3 text-sm bg-[#141933] border border-cyan-500/40 rounded-xl focus:outline-none focus:border-cyan-400 leading-relaxed text-white shadow-[0_0_10px_rgba(0,243,255,0.1)] font-sans"
            />
          </div>

          {/* SECTION 1: COVER IMAGE VIA MEDIA UPLOADER */}
          <div className="p-4 bg-[#101428] rounded-2xl border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  1. Image de couverture (Principale)
                </h3>
                <p className="text-xs text-cyan-400/60">
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
              <span className="text-[11px] text-cyan-400/70 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Suggestions de visuels :
              </span>
              {PRESET_IMAGES.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setCoverImage(p.url);
                    setCoverImageAlt(p.alt);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                    coverImage === p.url
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold shadow-[0_0_10px_rgba(0,243,255,0.3)]'
                      : 'bg-[#141933] border-cyan-500/30 text-slate-300 hover:border-cyan-400/60'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 2: PHOTO GALLERY */}
          <div className="p-4 bg-[#101428] rounded-2xl border border-cyan-500/30 space-y-4 font-mono">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <Images className="w-4 h-4 text-cyan-400" />
                  2. Galerie photo (Reportage / Enquête)
                </h3>
                <p className="text-xs text-cyan-400/60">
                  Ajoutez plusieurs clichés avec légendes pour enrichir votre reportage.
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 bg-[#141933] border border-cyan-500/30 rounded-lg text-cyan-300">
                {gallery.length} photo{gallery.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* List of current gallery items */}
            {gallery.length > 0 && (
              <div className="space-y-3">
                {gallery.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-[#141933] rounded-xl border border-cyan-500/30"
                  >
                    <img
                      src={item.url}
                      alt={item.altText || `Photo ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-lg shrink-0 border border-cyan-500/40"
                    />

                    <div className="flex-1 w-full space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={item.caption || ''}
                          onChange={(e) => handleUpdateGalleryItemCaption(idx, e.target.value)}
                          placeholder="Légende de la photo..."
                          className="w-full px-3 py-1.5 text-xs bg-[#101428] border border-cyan-500/30 rounded-lg text-white placeholder-cyan-500/40"
                        />
                        <input
                          type="text"
                          value={item.altText || ''}
                          onChange={(e) => handleUpdateGalleryItemAlt(idx, e.target.value)}
                          placeholder="Texte alt (accessibilité)..."
                          className="w-full px-3 py-1.5 text-xs bg-[#101428] border border-cyan-500/30 rounded-lg text-white placeholder-cyan-500/40"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryItem(idx)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition shrink-0 cursor-pointer"
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
                className="w-full py-2.5 border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-xl text-xs font-semibold text-cyan-300 hover:text-cyan-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Ajouter une photo à la galerie
              </button>
            ) : (
              <div className="p-4 bg-[#141933] rounded-xl border border-cyan-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300">
                    Sélectionner ou téléverser une photo
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingGalleryPhoto(false)}
                    className="text-cyan-400/60 hover:text-cyan-200 text-xs cursor-pointer"
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
          <div className="p-4 bg-[#101428] rounded-2xl border border-cyan-500/30 space-y-4 font-mono">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <VideoIcon className="w-4 h-4 text-cyan-400" />
                  3. Reportage Vidéo (Optionnel)
                </h3>
                <p className="text-xs text-cyan-400/60">
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
                  className="text-xs text-red-400 hover:underline cursor-pointer"
                >
                  Supprimer la vidéo
                </button>
              )}
            </div>

            {videoUrl ? (
              <div className="space-y-2">
                <VideoPlayer src={videoUrl} poster={videoThumbnail} title={title} />
                <p className="text-[11px] text-cyan-400/60">
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
            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
              Tags / Mots-clés (séparés par des virgules)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Burkina Faso, Économie, Sahel, Ouagadougou, AES"
              className="w-full px-4 py-2 text-xs bg-[#141933] border border-cyan-500/40 rounded-xl focus:outline-none focus:border-cyan-400 text-white shadow-[0_0_10px_rgba(0,243,255,0.1)]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-cyan-500/30 flex items-center justify-end gap-3 font-mono">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-cyan-400 hover:text-cyan-200 hover:bg-[#141933] rounded-xl transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black text-xs font-bold rounded-xl shadow-[0_0_15px_rgba(0,243,255,0.4)] hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
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
