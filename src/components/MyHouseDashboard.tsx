import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Crown,
  UserPlus,
  UserMinus,
  CheckCircle2,
  FileText,
  Plus,
  ArrowRight,
  Trash2,
  PenTool,
  Eye,
  Heart,
  MessageSquare,
  Sparkles,
  Award,
  Phone,
  Mail,
  MapPin,
  Globe,
  Tag,
  AlertCircle,
  Save,
  Send,
  Calendar,
  Layers,
  Edit3,
  Check,
  Shield,
} from 'lucide-react';
import { MediaHouse, User, Article, Category } from '../types';
import { api } from '../services/api';

const SPECIALTY_OPTIONS = [
  'PURGEUR',
  'CLANS',
  'FAMILLES',
  'PURGE',
  'COMPÉTITION',
  'CÉLÉBRITÉS',
  'Investigation & Faits d’armes',
  'Stratégie & Territoires',
  'Vérification & Fact-Checking',
];

const EDITORIAL_ROLE_PRESETS = [
  'Chef de Rédaction',
  'Rédacteur en chef adjoint',
  'Grand Reporter d\'Investigation',
  'Journaliste d\'Enquête',
  'Chef de Rubrique Économie',
  'Chef de Rubrique Politique',
  'Correspondant Régional International',
  'Éditorialiste',
  'Chroniqueur Déontologique',
];

const LOGO_PRESETS = [
  { name: 'Investigation', url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=200&auto=format&fit=crop&q=80' },
  { name: 'Économie', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&auto=format&fit=crop&q=80' },
  { name: 'Tech & IA', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80' },
  { name: 'Culture & Société', url: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=200&auto=format&fit=crop&q=80' },
  { name: 'Monde & Régions', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=200&auto=format&fit=crop&q=80' },
];

const COVER_PRESETS = [
  { name: 'Rédaction Moderne', url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Studio News', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Plateau Média', url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=80' },
];

interface MyHouseDashboardProps {
  myHouse: MediaHouse;
  isChef: boolean;
  currentUser: User;
  houseArticles: Article[];
  houseStats: {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalArticles: number;
  };
  availableJournalists: (User & { isAvailable: boolean; currentHouseName?: string })[];
  onOpenArticle?: (article: Article) => void;
  onOpenCreateArticle?: () => void;
  onRefreshHouse: () => Promise<void>;
  onDeleteHouse: (houseId: string, houseName: string) => Promise<void>;
  showMsg: (type: 'success' | 'error', message: string) => void;
}

export const MyHouseDashboard: React.FC<MyHouseDashboardProps> = ({
  myHouse,
  isChef,
  currentUser,
  houseArticles,
  houseStats,
  availableJournalists,
  onOpenArticle,
  onOpenCreateArticle,
  onRefreshHouse,
  onDeleteHouse,
  showMsg,
}) => {
  const [subTab, setSubTab] = useState<'overview' | 'publish' | 'team' | 'articles' | 'editorial-desk' | 'settings'>('overview');

  // Categories and publishing state for house journalists
  const [categories, setCategories] = useState<Category[]>([]);
  const [pubTitle, setPubTitle] = useState<string>('');
  const [pubCategoryId, setPubCategoryId] = useState<string>('');
  const [pubSummary, setPubSummary] = useState<string>('');
  const [pubContent, setPubContent] = useState<string>('');
  const [pubCoverImage, setPubCoverImage] = useState<string>('');
  const [pubTags, setPubTags] = useState<string>('');
  const [pubSubmitting, setPubSubmitting] = useState<boolean>(false);
  const [pubSuccessMsg, setPubSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getCategories()
      .then((res) => {
        if (res.categories && res.categories.length > 0) {
          setCategories(res.categories);
          setPubCategoryId(res.categories[0].id);
        }
      })
      .catch((err) => console.error('Error fetching categories in MyHouseDashboard:', err));
  }, []);

  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = pubTitle.trim();
    const cleanContent = pubContent.trim();
    if (!cleanTitle || cleanTitle.length < 5) {
      showMsg('error', 'Le titre doit contenir au moins 5 caractères.');
      return;
    }
    if (!cleanContent || cleanContent.length < 30) {
      showMsg('error', 'Le contenu doit comporter au moins 30 caractères.');
      return;
    }
    if (!pubCategoryId) {
      showMsg('error', 'Veuillez sélectionner une catégorie.');
      return;
    }

    setPubSubmitting(true);
    try {
      const tagsArray = pubTags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      await api.createArticle({
        title: cleanTitle,
        summary: pubSummary.trim() || cleanTitle.substring(0, 160),
        content: cleanContent,
        categoryId: pubCategoryId,
        tags: tagsArray.length > 0 ? tagsArray : (myHouse.specialties || ['Information']),
        coverImage: pubCoverImage.trim() || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
        status: 'published',
      });

      setPubSuccessMsg(`Votre article « ${cleanTitle} » a été publié avec succès sous l'égide officielle de ${myHouse.name} !`);
      setPubTitle('');
      setPubSummary('');
      setPubContent('');
      setPubCoverImage('');
      setPubTags('');
      showMsg('success', `Article publié avec succès au nom de ${myHouse.name} !`);
      await onRefreshHouse();
      setTimeout(() => {
        setPubSuccessMsg(null);
      }, 7000);
    } catch (err: any) {
      showMsg('error', err?.message || 'Erreur lors de la publication de l’article.');
    } finally {
      setPubSubmitting(false);
    }
  };

  // Member management state
  const [selectedJournalistId, setSelectedJournalistId] = useState<string>('');
  const [addingMember, setAddingMember] = useState<boolean>(false);
  const [editingRoleMemberId, setEditingRoleMemberId] = useState<string | null>(null);
  const [memberRoleInput, setMemberRoleInput] = useState<string>('');
  const [savingRole, setSavingRole] = useState<boolean>(false);

  // Editorial desk notes state
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const [newNotePriority, setNewNotePriority] = useState<'urgent' | 'standard' | 'investigation'>('standard');
  const [addingNote, setAddingNote] = useState<boolean>(false);

  // House settings editing state
  const [editName, setEditName] = useState<string>(myHouse.name);
  const [editMotto, setEditMotto] = useState<string>(myHouse.motto || "L'information vérifiée, sans concession.");
  const [editDescription, setEditDescription] = useState<string>(myHouse.description || '');
  const [editLogo, setEditLogo] = useState<string>(myHouse.logo || '');
  const [editCover, setEditCover] = useState<string>(myHouse.coverImage || '');
  const [editPhone, setEditPhone] = useState<string>(myHouse.phone || '');
  const [editEmail, setEditEmail] = useState<string>(myHouse.email || '');
  const [editWebsite, setEditWebsite] = useState<string>(myHouse.website || '');
  const [editAddress, setEditAddress] = useState<string>(myHouse.address || 'Bureau Éditorial Central');
  const [editSpecialties, setEditSpecialties] = useState<string[]>(myHouse.specialties || ['Investigation', 'Économie & Finance', 'Société']);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Articles filtering state
  const [articlesSearchQuery, setArticlesSearchQuery] = useState<string>('');
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState<string>('all');

  const membersList = myHouse.membersData || [];
  const memberIds = myHouse.members || [myHouse.ownerId];
  const quotaUsed = memberIds.length;
  const maxJournalists = myHouse.maxJournalists || 5;
  const spotsAvailable = Math.max(0, maxJournalists - quotaUsed);

  // Member role updater
  const handleAssignRole = async (memberId: string, title: string) => {
    setSavingRole(true);
    try {
      await api.assignMemberRole(myHouse.id, memberId, title);
      showMsg('success', `Titre de « ${title} » attribué avec succès.`);
      setEditingRoleMemberId(null);
      setMemberRoleInput('');
      await onRefreshHouse();
    } catch (err: any) {
      showMsg('error', err.message || 'Impossible de mettre à jour le rôle.');
    } finally {
      setSavingRole(false);
    }
  };

  // Add member
  const handleAddMember = async () => {
    if (!selectedJournalistId) return;
    setAddingMember(true);
    try {
      const res = await api.addMediaHouseMember(myHouse.id, selectedJournalistId);
      showMsg('success', res.message || 'Journaliste accrédité intégré dans la maison !');
      setSelectedJournalistId('');
      await onRefreshHouse();
    } catch (err: any) {
      showMsg('error', err.message || "Erreur lors de l'intégration du journaliste.");
    } finally {
      setAddingMember(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    const isSelf = memberId === currentUser.id;
    const confirmPrompt = isSelf
      ? `Confirmez-vous vouloir quitter la maison "${myHouse.name}" ?`
      : `Confirmez-vous le retrait de "${memberName}" de l'équipe de rédaction ?`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      const res = await api.removeMediaHouseMember(myHouse.id, memberId);
      showMsg('success', res.message || 'Opération effectuée.');
      await onRefreshHouse();
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors du retrait du journaliste.');
    }
  };

  // Post note to editorial desk
  const handleAddEditorialNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    setAddingNote(true);
    try {
      const res = await api.addEditorialNote(myHouse.id, newNoteContent.trim(), newNotePriority);
      showMsg('success', res.message || 'Note ajoutée au carnet de bord de la rédaction.');
      setNewNoteContent('');
      await onRefreshHouse();
    } catch (err: any) {
      showMsg('error', err.message || "Erreur lors de l'ajout de la note.");
    } finally {
      setAddingNote(false);
    }
  };

  // Delete note from editorial desk
  const handleDeleteEditorialNote = async (noteId: string) => {
    if (!window.confirm('Voulez-vous supprimer cette note de service ?')) return;
    try {
      await api.deleteEditorialNote(myHouse.id, noteId);
      showMsg('success', 'Note supprimée du carnet de bord.');
      await onRefreshHouse();
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors de la suppression.');
    }
  };

  // Save house settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || editName.trim().length < 3) {
      showMsg('error', 'Le nom de la maison doit comporter au moins 3 caractères.');
      return;
    }
    setSavingSettings(true);
    try {
      const res = await api.updateMediaHouse(myHouse.id, {
        name: editName.trim(),
        motto: editMotto.trim(),
        description: editDescription.trim(),
        logo: editLogo.trim() || undefined,
        coverImage: editCover.trim() || undefined,
        phone: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        website: editWebsite.trim() || undefined,
        address: editAddress.trim() || undefined,
        specialties: editSpecialties,
      });
      showMsg('success', res.message || 'Paramètres de la maison mis à jour avec succès.');
      await onRefreshHouse();
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors de la mise à jour des paramètres.');
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleSpecialty = (spec: string) => {
    if (editSpecialties.includes(spec)) {
      setEditSpecialties(editSpecialties.filter((s) => s !== spec));
    } else {
      setEditSpecialties([...editSpecialties, spec]);
    }
  };

  // Filtered articles
  const filteredArticles = houseArticles.filter((art) => {
    const matchesSearch =
      !articlesSearchQuery.trim() ||
      art.title.toLowerCase().includes(articlesSearchQuery.toLowerCase()) ||
      art.authorName.toLowerCase().includes(articlesSearchQuery.toLowerCase());
    const matchesAuthor =
      selectedAuthorFilter === 'all' || art.authorId === selectedAuthorFilter;
    return matchesSearch && matchesAuthor;
  });

  return (
    <div id="my-house-dashboard" className="space-y-6 animate-fadeIn">
      {/* 1. TOP SUB-NAVIGATION BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-2xl bg-stone-900/90 border border-cyan-500/20 shadow-md">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            id="subtab-overview-btn"
            onClick={() => setSubTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              subTab === 'overview'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,243,255,0.2)]'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Cockpit</span>
          </button>

          <button
            id="subtab-team-btn"
            onClick={() => setSubTab('team')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              subTab === 'team'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,243,255,0.2)]'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Équipe ({quotaUsed}/{maxJournalists})</span>
          </button>

          <button
            id="subtab-publish-btn"
            onClick={() => setSubTab('publish')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              subTab === 'publish'
                ? 'bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-blue-600/20 text-cyan-200 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,243,255,0.25)]'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/80 bg-stone-900/60 border border-stone-800'
            }`}
          >
            <PenTool className="w-4 h-4 text-cyan-400" />
            <span>Espace Publication</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-extrabold uppercase">
              Rédaction
            </span>
          </button>

          <button
            id="subtab-articles-btn"
            onClick={() => setSubTab('articles')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              subTab === 'articles'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,243,255,0.2)]'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Articles ({houseArticles.length})</span>
          </button>

          <button
            id="subtab-editorial-desk-btn"
            onClick={() => setSubTab('editorial-desk')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              subTab === 'editorial-desk'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,243,255,0.2)]'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Conférence de Rédaction</span>
            {myHouse.editorialNotes && myHouse.editorialNotes.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-400 text-black font-extrabold">
                {myHouse.editorialNotes.length}
              </span>
            )}
          </button>

          {(isChef || currentUser.role === 'admin') && (
            <button
              id="subtab-settings-btn"
              onClick={() => setSubTab('settings')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                subTab === 'settings'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,243,255,0.2)]'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Ligne & Paramètres</span>
            </button>
          )}
        </div>

        {/* Global Quick Action: Publish Article for the House */}
        {onOpenCreateArticle && (
          <button
            id="newsroom-publish-article-btn"
            onClick={onOpenCreateArticle}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(0,243,255,0.35)] transition cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Rédiger un article</span>
          </button>
        )}
      </div>

      {/* 2. SUBTAB: OVERVIEW (COCKPIT) */}
      {subTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Hero House Accreditation Banner */}
          <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-[#0c101a] shadow-lg">
            {/* Banner Cover */}
            <div className="h-36 sm:h-44 w-full overflow-hidden relative">
              <img
                src={myHouse.coverImage || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80'}
                alt={myHouse.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c101a] via-[#0c101a]/60 to-transparent" />

              {/* Verified CSC Accreditation Seal badge */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 backdrop-blur-md flex items-center gap-1.5 shadow-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Accréditation CSC Officielle
                </span>
              </div>
            </div>

            {/* Profile Info Overlay */}
            <div className="p-5 -mt-12 relative z-10 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                <div className="flex items-end gap-3.5">
                  <img
                    src={myHouse.logo || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80'}
                    alt={myHouse.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-400 bg-black shadow-[0_0_20px_rgba(0,243,255,0.3)] shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                        {myHouse.name}
                      </h2>
                      {isChef ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-cyan-300 border border-blue-400/40 flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-cyan-400" /> Chef de Rédaction
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-cyan-400" /> Journaliste Titulaire
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      Fondée & dirigée par <strong className="text-stone-200">{myHouse.ownerName}</strong> • {myHouse.address || 'Bureau Éditorial Central'}
                    </p>
                  </div>
                </div>

                {/* Quota counter */}
                <div className="flex items-center gap-2">
                  <div className="px-3.5 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-right">
                    <div className="text-[10px] text-cyan-300 font-mono uppercase font-bold">Quota Rédaction</div>
                    <div className="text-base font-black text-white font-mono">
                      {quotaUsed} <span className="text-cyan-400 font-normal">/ {maxJournalists} max</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slogan / Motto */}
              {myHouse.motto && (
                <div className="p-3 rounded-xl bg-cyan-950/20 border-l-4 border-cyan-400 text-xs italic text-cyan-200/90 font-serif">
                  « {myHouse.motto} »
                </div>
              )}

              {/* Editorial Description */}
              <p className="text-xs text-stone-300 leading-relaxed pt-1">
                {myHouse.description}
              </p>

              {/* Specialties & Metadata tags */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-800/80">
                {myHouse.specialties && myHouse.specialties.length > 0 ? (
                  myHouse.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-stone-900 text-stone-300 border border-stone-700 flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3 text-cyan-400" />
                      #{spec}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-stone-500">Aucune spécialité spécifiée</span>
                )}

                {myHouse.phone && (
                  <span className="text-[11px] text-stone-400 flex items-center gap-1 ml-auto">
                    <Phone className="w-3 h-3 text-cyan-400" /> {myHouse.phone}
                  </span>
                )}
                {myHouse.email && (
                  <span className="text-[11px] text-stone-400 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-cyan-400" /> {myHouse.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quota Progress Bar */}
          <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" /> Quota Rédactionnel Strict (Max 5 Journalistes)
              </span>
              <span className="font-mono text-cyan-300 font-bold">
                {quotaUsed} sur 5 places occupées ({spotsAvailable} vacante{spotsAvailable > 1 ? 's' : ''})
              </span>
            </div>

            {/* 5 Slots representation */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              {[0, 1, 2, 3, 4].map((slotIdx) => {
                const member = membersList[slotIdx];
                const isOccupied = !!member || slotIdx < quotaUsed;
                const isChefSlot = slotIdx === 0;

                return (
                  <div
                    key={slotIdx}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      isOccupied
                        ? isChefSlot
                          ? 'bg-blue-950/30 border-blue-500/50 shadow-[0_0_10px_rgba(0,210,255,0.2)]'
                          : 'bg-cyan-950/30 border-cyan-500/40'
                        : 'bg-stone-950/40 border-dashed border-stone-800 text-stone-600'
                    }`}
                  >
                    <div className="text-[10px] font-mono font-bold mb-1">
                      {isChefSlot ? 'Chef (1)' : `Journaliste (${slotIdx + 1})`}
                    </div>
                    {isOccupied ? (
                      <div className="text-xs font-bold text-white truncate">
                        {member?.name || (isChefSlot ? myHouse.ownerName : 'Membre')}
                      </div>
                    ) : (
                      <div className="text-[11px] text-stone-500 italic">
                        Disponible
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DEDICATED NEWSROOM PUBLISHING WORKSPACE CARD */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c1527] via-[#09101d] to-[#0a1420] border-2 border-cyan-500/40 shadow-[0_0_25px_rgba(0,243,255,0.15)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-base font-black text-white">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-sm">
                    <PenTool className="w-4 h-4" />
                  </div>
                  <span>Espace Rédaction & Publication d'Articles</span>
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-xs text-stone-300">
                  Endroit officiel réservé aux journalistes de la maison : tout article rédigé ici est certifié et publié sous la bannière officielle de <strong className="text-cyan-300">{myHouse.name}</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Accrédité Publication</span>
                </span>
              </div>
            </div>

            {/* Journalist Author Identity strip */}
            <div className="p-3 rounded-xl bg-stone-900/90 border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-cyan-400/40 shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">
                    Rédacteur : <strong>{currentUser.name}</strong>
                  </div>
                  <div className="text-[11px] text-cyan-400 font-mono">
                    {isChef ? 'Chef de Rédaction' : 'Journaliste Titulaire'} • Maison : {myHouse.name}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSubTab('publish')}
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-cyan-950/90 hover:bg-cyan-900/90 text-cyan-200 border border-cyan-500/50 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <PenTool className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Rédiger dans la Maison</span>
                </button>
                {onOpenCreateArticle && (
                  <button
                    type="button"
                    onClick={onOpenCreateArticle}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 text-black text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,243,255,0.35)]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Grand Format & Médias</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Editorial KPIs Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>Publications</span>
                <FileText className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {houseStats.totalArticles}
              </div>
              <div className="text-[10px] text-stone-500">Articles sous le label</div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>Audience / Vues</span>
                <Eye className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {houseStats.totalViews.toLocaleString('fr-FR')}
              </div>
              <div className="text-[10px] text-stone-500">Lectures cumulées</div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>Engagement</span>
                <Heart className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {houseStats.totalLikes}
              </div>
              <div className="text-[10px] text-stone-500">Mentions "J'aime"</div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>Débats Citoyens</span>
                <MessageSquare className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {houseStats.totalComments}
              </div>
              <div className="text-[10px] text-stone-500">Commentaires modérés</div>
            </div>
          </div>

          {/* Bento Quick Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              onClick={() => setSubTab('team')}
              className="p-4 rounded-2xl bg-gradient-to-br from-stone-900 to-cyan-950/30 border border-cyan-500/30 hover:border-cyan-400 transition cursor-pointer group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
                  <Users className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition" />
              </div>
              <div className="text-sm font-bold text-white">Gérer l'Équipe</div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Attribuer les titres éditoriaux, recruter parmi les journalistes accrédités disponibles.
              </p>
            </div>

            <div
              onClick={() => setSubTab('editorial-desk')}
              className="p-4 rounded-2xl bg-gradient-to-br from-stone-900 to-blue-950/30 border border-blue-500/30 hover:border-cyan-400 transition cursor-pointer group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-blue-500/20 text-cyan-300">
                  <Layers className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition" />
              </div>
              <div className="text-sm font-bold text-white">Conférence de Rédaction</div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Partager des pistes d'enquête confidentielles et notes de service internes à la maison.
              </p>
            </div>

            <div
              onClick={() => setSubTab('articles')}
              className="p-4 rounded-2xl bg-gradient-to-br from-stone-900 to-blue-950/30 border border-blue-500/30 hover:border-blue-400 transition cursor-pointer group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300">
                  <FileText className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-blue-400 group-hover:translate-x-1 transition" />
              </div>
              <div className="text-sm font-bold text-white">Voir les Publications</div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Consulter l'historique complet des {houseArticles.length} articles publiés au nom de la maison.
              </p>
            </div>
          </div>

          {/* Latest 3 Articles Snapshot */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Dernières parutions de la rédaction
              </h4>
              <button
                onClick={() => setSubTab('articles')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
              >
                Toutes les publications ({houseArticles.length}) →
              </button>
            </div>

            {houseArticles.length === 0 ? (
              <div className="p-8 rounded-2xl bg-stone-900 border border-stone-800 text-center space-y-3">
                <FileText className="w-8 h-8 text-stone-600 mx-auto" />
                <p className="text-xs text-stone-400">
                  Aucun article publié pour l'instant au nom de {myHouse.name}.
                </p>
                {onOpenCreateArticle && (
                  <button
                    onClick={onOpenCreateArticle}
                    className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition cursor-pointer"
                  >
                    Publier le 1er article de la maison
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {houseArticles.slice(0, 3).map((art) => (
                  <div
                    key={art.id}
                    onClick={() => onOpenArticle?.(art)}
                    className="p-3 rounded-xl bg-stone-900 hover:bg-stone-800/80 border border-stone-800 hover:border-cyan-500/40 flex items-center justify-between gap-3 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={art.coverImage}
                        alt={art.title}
                        className="w-14 h-14 rounded-xl object-cover border border-stone-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-cyan-400">
                            {art.categoryName || 'Information'}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            • {new Date(art.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-white truncate hover:text-cyan-300">
                          {art.title}
                        </h5>
                        <p className="text-[11px] text-stone-400 truncate">
                          Rédigé par <strong className="text-stone-300">{art.authorName}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-stone-400">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Eye className="w-3.5 h-3.5 text-cyan-400" /> {art.viewsCount || 0}
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Heart className="w-3.5 h-3.5 text-cyan-400" /> {art.likesCount || 0}
                      </span>
                      <span className="text-cyan-400 font-bold ml-2">Lire →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SUBTAB: TEAM (MEMBERS & QUOTA) */}
      {subTab === 'team' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Team Quota Banner */}
          <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Équipe Rédactionnelle Accréditée ({quotaUsed} / {maxJournalists} journalistes)
              </h3>
              <p className="text-xs text-stone-300 mt-0.5">
                Règle stricte PURGE-INFO : une maison de presse rassemble au maximum 5 journalistes accrédités pour garantir la rigueur de vérification.
              </p>
            </div>

            <span className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold shrink-0 ${
              spotsAvailable > 0
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                : 'bg-blue-950/40 text-blue-300 border border-blue-400/40'
            }`}>
              {spotsAvailable > 0 ? `${spotsAvailable} place(s) disponible(s)` : 'Équipe au complet (5/5)'}
            </span>
          </div>

          {/* Members Cards List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {membersList.map((member) => {
              const isChefMember = member.id === myHouse.ownerId;
              const assignedTitle = myHouse.memberRoles?.[member.id] || (isChefMember ? 'Chef de Rédaction' : 'Journaliste Titulaire');
              const memberArticlesCount = houseArticles.filter((a) => a.authorId === member.id).length;

              return (
                <div
                  key={member.id}
                  className={`p-4 rounded-2xl border space-y-3 relative ${
                    isChefMember
                      ? 'bg-blue-950/20 border-blue-500/40 shadow-[0_0_15px_rgba(0,210,255,0.1)]'
                      : 'bg-stone-900 border-stone-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={member.name}
                        className="w-12 h-12 rounded-xl object-cover border border-cyan-400/40 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                          {member.name}
                          {isChefMember && <Crown className="w-4 h-4 text-cyan-400 shrink-0" title="Chef de Rédaction" />}
                        </div>
                        <div className="text-xs text-stone-400 truncate">{member.email}</div>
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isChefMember
                              ? 'bg-blue-500/20 text-cyan-300 border border-blue-400/40'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                          }`}>
                            <Award className="w-3 h-3" />
                            {assignedTitle}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Member Action Menu */}
                    <div className="flex items-center gap-1">
                      {isChef && !isChefMember && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/50 transition cursor-pointer"
                          title="Retirer ce journaliste de la maison"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}

                      {!isChef && member.id === currentUser.id && (
                        <button
                          onClick={() => handleRemoveMember(currentUser.id, currentUser.name)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/50 border border-red-500/40 transition cursor-pointer"
                        >
                          Quitter
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Articles stats for this member */}
                  <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400 font-mono">
                    <span>Publications dans la maison :</span>
                    <span className="font-bold text-cyan-300">{memberArticlesCount} article(s)</span>
                  </div>

                  {/* Chef Action: Edit Role for member */}
                  {isChef && (
                    <div className="pt-2 border-t border-stone-800/80">
                      {editingRoleMemberId === member.id ? (
                        <div className="space-y-2 animate-fadeIn">
                          <label className="text-[10px] font-bold text-cyan-300 block">
                            Modifier le titre éditorial :
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={memberRoleInput}
                              onChange={(e) => setMemberRoleInput(e.target.value)}
                              placeholder="Ex: Grand Reporter, Éditorialiste..."
                              className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                            />
                            <button
                              onClick={() => handleAssignRole(member.id, memberRoleInput)}
                              disabled={savingRole || !memberRoleInput.trim()}
                              className="px-3 py-1 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-lg disabled:opacity-50 transition cursor-pointer"
                            >
                              {savingRole ? '...' : 'Valider'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingRoleMemberId(null);
                                setMemberRoleInput('');
                              }}
                              className="px-2 py-1 text-xs text-stone-400 hover:text-white"
                            >
                              ✕
                            </button>
                          </div>
                          {/* Role presets */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {EDITORIAL_ROLE_PRESETS.slice(0, 4).map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setMemberRoleInput(preset)}
                                className="px-1.5 py-0.5 rounded text-[9px] bg-stone-800 hover:bg-stone-700 text-stone-300"
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingRoleMemberId(member.id);
                            setMemberRoleInput(assignedTitle);
                          }}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" /> Changer le titre éditorial
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Recruiter Box (Visible for Chef when spots are available) */}
          {isChef && spotsAvailable > 0 && (
            <div className="p-5 rounded-2xl bg-stone-900/80 border border-cyan-500/30 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                Recruter un confrère accrédité dans votre rédaction ({spotsAvailable} place(s) restante(s))
              </div>
              <p className="text-xs text-stone-400">
                Seuls les comptes accrédités par les 2 Comptes Principaux de PURGE-INFO peuvent rejoindre une Maison de Journalistes.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedJournalistId}
                  onChange={(e) => setSelectedJournalistId(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="">Sélectionner un journaliste disponible...</option>
                  {availableJournalists
                    .filter((j) => !memberIds.includes(j.id))
                    .map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.name} ({j.email}) {j.isAvailable ? '— Libre' : `— Déjà chez ${j.currentHouseName}`}
                      </option>
                    ))}
                </select>

                <button
                  onClick={handleAddMember}
                  disabled={!selectedJournalistId || addingMember}
                  className="px-5 py-2 text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  {addingMember ? 'Intégration...' : 'Intégrer à la rédaction'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. SUBTAB: ARTICLES (HOUSE PUBLICATIONS) */}
      {subTab === 'articles' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                placeholder="Rechercher parmi les publications de la maison..."
                value={articlesSearchQuery}
                onChange={(e) => setArticlesSearchQuery(e.target.value)}
                className="w-full sm:w-72 px-3 py-2 text-xs rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:border-cyan-400"
              />

              <select
                value={selectedAuthorFilter}
                onChange={(e) => setSelectedAuthorFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="all">Tous les auteurs de la maison</option>
                {membersList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {onOpenCreateArticle && (
              <button
                onClick={onOpenCreateArticle}
                className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" /> Nouvel article
              </button>
            )}
          </div>

          {/* Articles list */}
          {filteredArticles.length === 0 ? (
            <div className="p-10 rounded-2xl bg-stone-900 border border-stone-800 text-center space-y-3">
              <FileText className="w-8 h-8 text-stone-600 mx-auto" />
              <div className="text-sm font-bold text-white">Aucun article trouvé</div>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                {articlesSearchQuery
                  ? "Aucune publication ne correspond à vos critères de recherche."
                  : `Aucun article n'a encore été publié au nom de la maison ${myHouse.name}.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredArticles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => onOpenArticle?.(art)}
                  className="p-4 rounded-2xl bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-cyan-500/40 transition cursor-pointer group flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="h-32 w-full rounded-xl overflow-hidden relative">
                      <img
                        src={art.coverImage}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-black/70 text-cyan-300 border border-cyan-400/40 backdrop-blur-sm">
                        {art.categoryName || 'Information'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition line-clamp-2">
                      {art.title}
                    </h4>

                    {art.summary && (
                      <p className="text-xs text-stone-400 line-clamp-2">
                        {art.summary}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
                    <span className="truncate">
                      Par <strong className="text-stone-300">{art.authorName}</strong>
                    </span>
                    <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-cyan-400" /> {art.viewsCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-cyan-400" /> {art.likesCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. SUBTAB: EDITORIAL DESK (CONFÉRENCE DE RÉDACTION & PISTES) */}
      {subTab === 'editorial-desk' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Memo Creator */}
          <form
            onSubmit={handleAddEditorialNote}
            className="p-5 rounded-2xl bg-stone-900 border border-blue-500/30 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Conférence de Rédaction • Nouveau mémo ou piste d'enquête
              </h4>
              <span className="text-[10px] text-cyan-300/80 font-mono">
                Espace confidentiel aux 5 membres de la maison
              </span>
            </div>

            <textarea
              rows={3}
              required
              placeholder="Ex: Angle d'investigation sur les cours des matières premières, contact avec un témoin sur le terrain..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400 font-medium">Priorité :</span>
                <button
                  type="button"
                  onClick={() => setNewNotePriority('standard')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    newNotePriority === 'standard'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                      : 'bg-stone-950 text-stone-400 border-stone-800'
                  }`}
                >
                  🔵 Note standard
                </button>
                <button
                  type="button"
                  onClick={() => setNewNotePriority('investigation')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    newNotePriority === 'investigation'
                      ? 'bg-blue-600/30 text-cyan-200 border-cyan-400'
                      : 'bg-stone-950 text-stone-400 border-stone-800'
                  }`}
                >
                  🔷 Enquête en cours
                </button>
                <button
                  type="button"
                  onClick={() => setNewNotePriority('urgent')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    newNotePriority === 'urgent'
                      ? 'bg-blue-900/50 text-cyan-100 border-blue-400'
                      : 'bg-stone-950 text-stone-400 border-stone-800'
                  }`}
                >
                  ⚡ Urgent
                </button>
              </div>

              <button
                type="submit"
                disabled={addingNote || !newNoteContent.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {addingNote ? 'Envoi...' : 'Poster au carnet de bord'}
              </button>
            </div>
          </form>

          {/* Notes Feed */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Carnet de bord & Sujets en préparation ({myHouse.editorialNotes?.length || 0})
            </h4>

            {(!myHouse.editorialNotes || myHouse.editorialNotes.length === 0) ? (
              <div className="p-8 rounded-2xl bg-stone-900 border border-stone-800 text-center space-y-2">
                <Layers className="w-8 h-8 text-stone-600 mx-auto" />
                <p className="text-xs text-stone-400">
                  Le carnet de bord est vide. Utilisez cet espace pour coordonner vos enquêtes et angles avec les confrères de la maison.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {myHouse.editorialNotes.map((note) => {
                  const isAuthor = note.authorId === currentUser.id;
                  const canDelete = isAuthor || isChef || currentUser.role === 'admin';

                  return (
                    <div
                      key={note.id}
                      className={`p-4 rounded-2xl border space-y-2.5 ${
                        note.priority === 'urgent'
                          ? 'bg-blue-950/40 border-blue-400/50'
                          : note.priority === 'investigation'
                          ? 'bg-blue-950/20 border-cyan-500/40'
                          : 'bg-stone-900 border-stone-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            note.priority === 'urgent'
                              ? 'bg-blue-900/50 text-cyan-100 border border-blue-400/50'
                              : note.priority === 'investigation'
                              ? 'bg-blue-600/30 text-cyan-200 border border-cyan-400/40'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                          }`}>
                            {note.priority === 'urgent' ? '⚡ Urgent' : note.priority === 'investigation' ? '🔷 Enquête' : '🔵 Note interne'}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {note.authorName}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            • {new Date(note.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>

                        {canDelete && (
                          <button
                            onClick={() => handleDeleteEditorialNote(note.id)}
                            className="p-1 rounded-lg text-stone-500 hover:text-red-400 transition cursor-pointer"
                            title="Archiver / supprimer cette note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-stone-200 leading-relaxed whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. SUBTAB: SETTINGS (CHEF ONLY) */}
      {subTab === 'settings' && (isChef || currentUser.role === 'admin') && (
        <form onSubmit={handleSaveSettings} className="space-y-6 animate-fadeIn">
          <div className="p-5 rounded-2xl bg-stone-900 border border-cyan-500/30 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-cyan-400" />
              Identité Éditoriale & Coordonnées Officielles de la Maison
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Nom officiel de la Maison *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Slogan / Devise déontologique
                </label>
                <input
                  type="text"
                  value={editMotto}
                  onChange={(e) => setEditMotto(e.target.value)}
                  placeholder="Ex: L'information vérifiée, sans concession."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Ligne éditoriale & Charte de la rédaction *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Specialties selectors */}
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-bold text-stone-300">
                  Thématiques & Domaines d'investigation
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTY_OPTIONS.map((spec) => {
                    const isSelected = editSpecialties.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                            : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-white'
                        }`}
                      >
                        #{spec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Logo officiel (URL)
                </label>
                <input
                  type="url"
                  value={editLogo}
                  onChange={(e) => setEditLogo(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {LOGO_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setEditLogo(p.url)}
                      className="px-2 py-0.5 rounded-lg text-[10px] bg-stone-950 border border-stone-800 text-stone-400 hover:text-cyan-300"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover URL */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Bannière de couverture (URL)
                </label>
                <input
                  type="url"
                  value={editCover}
                  onChange={(e) => setEditCover(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {COVER_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setEditCover(p.url)}
                      className="px-2 py-0.5 rounded-lg text-[10px] bg-stone-950 border border-stone-800 text-stone-400 hover:text-cyan-300"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Press Contact Coordinates */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Téléphone / WhatsApp Rédaction
                </label>
                <input
                  type="text"
                  placeholder="+226 XX XX XX XX"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Email de Presse
                </label>
                <input
                  type="email"
                  placeholder="redaction@..."
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Siège de la rédaction
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-800 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(0,243,255,0.3)] transition cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {savingSettings ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>

          {/* Danger Zone: Dissolution */}
          <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h5 className="text-xs font-bold text-red-300">Zone de danger • Dissolution de la maison</h5>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Dissout la rédaction et libère les journalistes membres. Les articles publiés resteront archivés.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDeleteHouse(myHouse.id, myHouse.name)}
              className="px-4 py-2 rounded-xl bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Dissoudre la maison
            </button>
          </div>
        </form>
      )}

      {/* 6. SUBTAB: DEDICATED NEWSROOM PUBLISHING WORKSPACE */}
      {subTab === 'publish' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/50 via-blue-950/40 to-[#0a1420] border-2 border-cyan-500/40 shadow-[0_0_25px_rgba(0,243,255,0.15)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black font-black shadow-md shrink-0">
                  <PenTool className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black text-white">
                      Espace de Rédaction & Publication d'Articles
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                      Signature : {myHouse.name}
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 mt-0.5">
                    Endroit officiel pour les journalistes de la maison : tout article rédigé ici est certifié et publié sous la responsabilité éditoriale de <strong>{myHouse.name}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Accréditation CSC Validée</span>
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-stone-300">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Auteur titulaire : <strong className="text-white">{currentUser.name}</strong> ({isChef ? 'Chef de Rédaction' : 'Journaliste Titulaire'})
                </span>
              </div>
              <div className="text-cyan-400/90 font-mono text-[11px]">
                Organe de presse certifié PURGE-INFO (Quota: max 5 journalistes)
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {pubSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500/60 text-emerald-200 text-xs font-bold flex items-center gap-3 animate-fadeIn shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{pubSuccessMsg}</span>
            </div>
          )}

          {/* Publishing Form */}
          <form onSubmit={handlePublishArticle} className="p-6 rounded-2xl bg-stone-900 border border-cyan-500/30 space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Rédiger une dépêche ou un article pour la Maison
              </h4>

              {onOpenCreateArticle && (
                <button
                  type="button"
                  onClick={onOpenCreateArticle}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Basculer sur l'Atelier Grand Format (Photos, Vidéos, Chapô) →</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Left 2 Cols: Main Content */}
              <div className="md:col-span-2 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-stone-200 mb-1.5">
                    Titre de l'article *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Révélations sur le nouveau sommet économique international..."
                    value={pubTitle}
                    onChange={(e) => setPubTitle(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white placeholder-stone-500 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                {/* Category & Tags Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-200 mb-1.5">
                      Rubrique éditoriale *
                    </label>
                    <select
                      required
                      value={pubCategoryId}
                      onChange={(e) => setPubCategoryId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-stone-200 focus:outline-none focus:border-cyan-400 transition"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-200 mb-1.5">
                      Mots-clés / Tags (séparés par virgules)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Investigation, Politique, Justice"
                      value={pubTags}
                      onChange={(e) => setPubTags(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white placeholder-stone-500 focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                </div>

                {/* Short Summary */}
                <div>
                  <label className="block text-xs font-bold text-stone-200 mb-1.5">
                    Chapô / Résumé percutant
                  </label>
                  <input
                    type="text"
                    placeholder="Synthèse de l'information en 1 à 2 phrases pour accrocher les lecteurs..."
                    value={pubSummary}
                    onChange={(e) => setPubSummary(e.target.value)}
                    className="w-full px-4 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white placeholder-stone-500 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                {/* Main Content */}
                <div>
                  <label className="block text-xs font-bold text-stone-200 mb-1.5">
                    Contenu complet de l'article * (minimum 30 caractères)
                  </label>
                  <textarea
                    rows={8}
                    required
                    placeholder="Rédigez ici votre article, dépêche vérifiée, enquête ou analyse de fond..."
                    value={pubContent}
                    onChange={(e) => setPubContent(e.target.value)}
                    className="w-full px-4 py-3 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white placeholder-stone-500 focus:outline-none focus:border-cyan-400 font-sans leading-relaxed transition"
                  />
                  <div className="flex justify-between items-center text-[10px] text-stone-500 mt-1 font-mono">
                    <span>{pubContent.length} caractères saisis</span>
                    <span>Min. 30 caractères</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Media & Official Seal */}
              <div className="space-y-4">
                {/* Cover Image */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-200">
                    Image de couverture (URL)
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={pubCoverImage}
                    onChange={(e) => setPubCoverImage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white placeholder-stone-500 focus:outline-none focus:border-cyan-400 transition"
                  />

                  {/* Preset cover images */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-stone-400">Suggestions visuelles :</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPubCoverImage('https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1000&auto=format&fit=crop&q=80')}
                        className="p-1.5 rounded-lg bg-stone-950 border border-stone-800 hover:border-cyan-500/50 text-[10px] text-stone-300 hover:text-cyan-300 text-left truncate transition"
                      >
                        Presse & Médias
                      </button>
                      <button
                        type="button"
                        onClick={() => setPubCoverImage('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&auto=format&fit=crop&q=80')}
                        className="p-1.5 rounded-lg bg-stone-950 border border-stone-800 hover:border-cyan-500/50 text-[10px] text-stone-300 hover:text-cyan-300 text-left truncate transition"
                      >
                        Monde & Géopolitique
                      </button>
                      <button
                        type="button"
                        onClick={() => setPubCoverImage('https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1000&auto=format&fit=crop&q=80')}
                        className="p-1.5 rounded-lg bg-stone-950 border border-stone-800 hover:border-cyan-500/50 text-[10px] text-stone-300 hover:text-cyan-300 text-left truncate transition"
                      >
                        Économie & Marchés
                      </button>
                      <button
                        type="button"
                        onClick={() => setPubCoverImage('https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&auto=format&fit=crop&q=80')}
                        className="p-1.5 rounded-lg bg-stone-950 border border-stone-800 hover:border-cyan-500/50 text-[10px] text-stone-300 hover:text-cyan-300 text-left truncate transition"
                      >
                        Technologies & IA
                      </button>
                    </div>
                  </div>

                  {/* Image Preview */}
                  <div className="h-28 w-full rounded-xl overflow-hidden border border-stone-800 bg-stone-950 relative">
                    <img
                      src={pubCoverImage.trim() || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80'}
                      alt="Aperçu couverture"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2">
                      <span className="text-[10px] text-stone-300 font-mono">Aperçu visuel</span>
                    </div>
                  </div>
                </div>

                {/* Accreditation & Legal Box */}
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                    <Shield className="w-4 h-4" />
                    <span>Engagement Déontologique</span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    Tout article publié engage la charte et la réputation de la maison <strong>{myHouse.name}</strong>. Assurez-vous de la vérification des sources.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Toolbar */}
            <div className="pt-4 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-stone-400 flex items-center gap-2">
                <Crown className="w-4 h-4 text-cyan-400" />
                <span>Publié sous le label officiel : <strong className="text-white">{myHouse.name}</strong></span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={pubSubmitting}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-50 text-black font-black text-xs shadow-[0_0_18px_rgba(0,243,255,0.4)] transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{pubSubmitting ? 'Publication en cours...' : `Publier au nom de ${myHouse.name}`}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Recent Publications from the House */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Derniers articles publiés par la rédaction ({houseArticles.length})
              </h4>
              <button
                type="button"
                onClick={() => setSubTab('articles')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
              >
                Voir toute la liste →
              </button>
            </div>

            {houseArticles.length === 0 ? (
              <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 text-center text-xs text-stone-400">
                Aucun article publié pour l'instant. Utilisez le formulaire ci-dessus pour publier le premier article de la maison !
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {houseArticles.slice(0, 4).map((art) => (
                  <div
                    key={art.id}
                    onClick={() => onOpenArticle?.(art)}
                    className="p-3 rounded-xl bg-stone-900 hover:bg-stone-800/80 border border-stone-800 hover:border-cyan-500/40 flex items-center justify-between gap-3 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={art.coverImage}
                        alt={art.title}
                        className="w-12 h-12 rounded-xl object-cover border border-stone-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono font-bold text-cyan-400">
                          {art.categoryName || 'Information'}
                        </span>
                        <h5 className="text-xs font-bold text-white truncate hover:text-cyan-300">
                          {art.title}
                        </h5>
                        <p className="text-[10px] text-stone-400 truncate">
                          Par {art.authorName}
                        </p>
                      </div>
                    </div>
                    <span className="text-cyan-400 text-xs font-bold shrink-0">Lire →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
