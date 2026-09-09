import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Search,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  UploadCloud,
  HardDrive,
  Eye,
  RefreshCw,
  Clock,
  User as UserIcon,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { MediaRecord, MediaUsageType } from '../../types';
import { api } from '../../services/api';
import { getThumbnailUrl, formatBytes } from '../../services/cloudinary';
import { MediaUploader } from '../media/MediaUploader';
import { AdminConfirmDialog } from './AdminConfirmDialog';

interface AdminMediaAssetsTabProps {
  onFlash: (msg: string) => void;
}

export const AdminMediaAssetsTab: React.FC<AdminMediaAssetsTabProps> = ({ onFlash }) => {
  const [records, setRecords] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [usageFilter, setUsageFilter] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Deletion state
  const [deletingRecord, setDeletingRecord] = useState<MediaRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const res = await api.getMediaRecords({
        type: typeFilter === 'all' ? undefined : typeFilter,
        usageType: usageFilter === 'all' ? undefined : usageFilter,
      });
      setRecords(res.mediaRecords || []);
    } catch (err: any) {
      console.error('Erreur chargement médiathèque:', err);
      onFlash(`Erreur: ${err.message || 'Impossible de charger la médiathèque.'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [typeFilter, usageFilter]);

  // Compute metrics
  const totalFiles = records.length;
  const imageCount = records.filter((r) => r.resourceType === 'image').length;
  const videoCount = records.filter((r) => r.resourceType === 'video').length;
  const totalBytes = records.reduce((acc, r) => acc + (r.bytes || 150000), 0);

  // Filter with search query
  const filteredRecords = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.altText && r.altText.toLowerCase().includes(q)) ||
      (r.publicId && r.publicId.toLowerCase().includes(q)) ||
      (r.ownerName && r.ownerName.toLowerCase().includes(q)) ||
      (r.caption && r.caption.toLowerCase().includes(q)) ||
      r.url.toLowerCase().includes(q)
    );
  });

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    setDeleteLoading(true);
    try {
      await api.deleteMediaRecord(deletingRecord.publicId);
      onFlash('Média supprimé avec succès de la plateforme.');
      setDeletingRecord(null);
      loadMedia();
    } catch (err: any) {
      onFlash(`Échec de la suppression : ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getUsageBadge = (usageType: MediaUsageType) => {
    switch (usageType) {
      case 'avatar':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Avatar profil</span>;
      case 'cover':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">Bannière profil</span>;
      case 'article_cover':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Couverture article</span>;
      case 'article_gallery':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Galerie reportage</span>;
      case 'article_video':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800">Vidéo article</span>;
      case 'press_card':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-800">Carte de presse</span>;
      case 'media_logo':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Logo rédaction</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600">Général</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-semibold uppercase">Fichiers totaux</span>
            <HardDrive className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-stone-900">{totalFiles}</p>
          <span className="text-[11px] text-stone-500 font-medium">Médias référencés</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-semibold uppercase">Images</span>
            <ImageIcon className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-stone-900">{imageCount}</p>
          <span className="text-[11px] text-stone-500 font-medium">JPG, PNG, WebP</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-semibold uppercase">Vidéos</span>
            <VideoIcon className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-2xl font-black text-stone-900">{videoCount}</p>
          <span className="text-[11px] text-stone-500 font-medium">MP4, WebM</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-semibold uppercase">Espace Estimé</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-stone-900">{formatBytes(totalBytes)}</p>
          <span className="text-[11px] text-stone-500 font-medium">Cloudinary CDN</span>
        </div>
      </div>

      {/* Control Bar: Filters, Search, Upload Button */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par identifiant, légende, propriétaire..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-800 font-medium"
          >
            <option value="all">Tous types (Images & Vidéos)</option>
            <option value="image">Images uniquement</option>
            <option value="video">Vidéos uniquement</option>
          </select>

          <select
            value={usageFilter}
            onChange={(e) => setUsageFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-800 font-medium"
          >
            <option value="all">Toutes utilisations</option>
            <option value="article_cover">Couvertures d'articles</option>
            <option value="article_gallery">Galeries reportages</option>
            <option value="article_video">Vidéos d'articles</option>
            <option value="avatar">Avatars profils</option>
            <option value="cover">Bannières profils</option>
            <option value="press_card">Cartes de presse</option>
            <option value="media_logo">Logos rédactions</option>
          </select>

          <button
            type="button"
            onClick={loadMedia}
            disabled={loading}
            className="p-2 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition"
            title="Actualiser la liste"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Nouveau média</span>
          </button>
        </div>
      </div>

      {/* Media Grid */}
      {loading && records.length === 0 ? (
        <div className="py-16 text-center text-stone-500">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold">Chargement des ressources multimédias...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-stone-200 p-8">
          <ImageIcon className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-stone-700">Aucun média trouvé</p>
          <p className="text-xs text-stone-500 mt-1">
            Essayez de modifier vos filtres ou téléversez un nouveau fichier.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRecords.map((m) => {
            const dateStr = new Date(m.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Visual Thumbnail Preview */}
                <div className="relative aspect-video bg-stone-100 overflow-hidden group">
                  {m.resourceType === 'video' ? (
                    <div className="w-full h-full relative flex items-center justify-center bg-black">
                      <video
                        src={m.url}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <VideoIcon className="w-8 h-8 text-white/80" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={getThumbnailUrl(m.url, 400)}
                      alt={m.altText || m.publicId}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  )}

                  {/* Resource type badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-white backdrop-blur-xs flex items-center gap-1">
                      {m.resourceType === 'video' ? (
                        <VideoIcon className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <ImageIcon className="w-3 h-3 text-emerald-400" />
                      )}
                      {m.format ? m.format.toUpperCase() : m.resourceType.toUpperCase()}
                    </span>
                  </div>

                  {/* External link action */}
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 hover:bg-black text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Ouvrir l'original dans un nouvel onglet"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Details Body */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      {getUsageBadge(m.usageType)}
                      <span className="text-[10px] text-stone-400 font-mono flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {dateStr}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-stone-900 line-clamp-1" title={m.altText || m.publicId}>
                      {m.altText || m.caption || m.publicId}
                    </p>

                    <p className="text-[11px] text-stone-500 font-mono truncate" title={m.publicId}>
                      ID: {m.publicId}
                    </p>
                  </div>

                  {/* Owner & Actions Footer */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-stone-600 flex items-center gap-1 truncate max-w-[140px]">
                      <UserIcon className="w-3 h-3 text-stone-400 shrink-0" />
                      <span className="truncate">{m.ownerName || 'Anonyme'}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setDeletingRecord(m)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Supprimer ce média"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal Drawer for Admin */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-emerald-600" />
                Téléverser un média dans Cloudinary
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Ce média sera directement optimisé, encodé et accessible sur le CDN Cloudinary pour purge-info.
            </p>

            <MediaUploader
              type="image"
              usageType="general"
              showAltInput={true}
              showCaptionInput={true}
              onChange={() => {
                onFlash('Fichier multimédia téléversé avec succès !');
                setShowUploadModal(false);
                loadMedia();
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog with Safety Check */}
      {deletingRecord && (
        <AdminConfirmDialog
          isOpen={true}
          title="Supprimer définitivement ce média ?"
          message={`Êtes-vous sûr de vouloir supprimer la ressource "${deletingRecord.altText || deletingRecord.publicId}" ? Cette action est irréversible et le serveur vérifie qu'aucun article actif n'en dépend.`}
          confirmLabel={deleteLoading ? 'Suppression...' : 'Supprimer définitivement'}
          confirmVariant="danger"
          isLoading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingRecord(null)}
        />
      )}
    </div>
  );
};
