import React, { useState, useEffect } from 'react';
import { LiveUpdate, UserRole } from '../types';
import { Radio, AlertTriangle, ShieldCheck, Clock, Send, Sparkles, Filter, Pin, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LiveFeedTimelineProps {
  onOpenArticleById?: (articleId: string) => void;
}

const INITIAL_LIVE_UPDATES: LiveUpdate[] = [
  {
    id: 'live-1',
    title: 'Déclaration conjointe de la commission sur la souveraineté numérique',
    content: 'Les représentants des télécoms et de la sécurité d\'État viennent d\'adopter le protocole de chiffrement souverain. Entrée en vigueur prévue dès le prochain trimestre.',
    authorName: 'Aissatou Diallo',
    authorRole: 'journalist',
    isUrgent: true,
    isOfficial: true,
    timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    category: 'Technologie & Cybersécurité',
  },
  {
    id: 'live-2',
    title: 'Ouverture du forum des énergies solaires décentralisées à Ouagadougou',
    content: 'Plus de 45 délégations d\'ingénieurs et d\'investisseurs régionaux sont réunies pour valider le raccordement des mini-centrales photovoltaïques autonomes.',
    authorName: 'Moussa Sawadogo',
    authorRole: 'journalist',
    isUrgent: false,
    isOfficial: true,
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    category: 'Énergie & Climat',
  },
  {
    id: 'live-3',
    title: 'Nouveau record d\'exportation pour la filière agro-écologique locale',
    content: 'Les volumes de transformation locale ont progressé de 28% sur le dernier semestre selon les bilans douaniers préliminaires communiqués ce matin.',
    authorName: 'Fatoumata Traoré',
    authorRole: 'journalist',
    isUrgent: false,
    isOfficial: false,
    timestamp: new Date(Date.now() - 52 * 60 * 1000).toISOString(),
    category: 'Économie',
  },
  {
    id: 'live-4',
    title: 'Alerte météo sahélienne : mise en veille préventive des corridors de transport',
    content: 'Un front de poussière dense et de vents violents traverse les régions du Nord. Les autorités recommandent la réduction des convois non prioritaires.',
    authorName: 'Rédaction purge-info',
    authorRole: 'admin',
    isUrgent: true,
    isOfficial: true,
    timestamp: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
    category: 'Société & Alerte',
  },
];

export const LiveFeedTimeline: React.FC<LiveFeedTimelineProps> = () => {
  const { user, isAuthenticated } = useAuth();
  const [updates, setUpdates] = useState<LiveUpdate[]>(() => {
    const saved = localStorage.getItem('purge_info_live_updates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_LIVE_UPDATES;
      }
    }
    return INITIAL_LIVE_UPDATES;
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'official'>('all');
  const [showPostForm, setShowPostForm] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Actualité');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [isOfficial, setIsOfficial] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('purge_info_live_updates', JSON.stringify(updates));
  }, [updates]);

  const canPost = user && (user.role === 'journalist' || user.role === 'admin');

  const handleCreateUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newUpdate: LiveUpdate = {
      id: `live-${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      authorName: user?.name || 'Journaliste accrédité',
      authorRole: user?.role || 'journalist',
      isUrgent,
      isOfficial,
      timestamp: new Date().toISOString(),
      category: newCategory,
    };

    setUpdates([newUpdate, ...updates]);
    setNewTitle('');
    setNewContent('');
    setIsUrgent(false);
    setIsOfficial(false);
    setShowPostForm(false);
  };

  const filteredUpdates = updates.filter((item) => {
    if (activeFilter === 'urgent') return item.isUrgent;
    if (activeFilter === 'official') return item.isOfficial;
    return true;
  });

  const formatRelativeTime = (iso: string) => {
    try {
      const diffMinutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
      if (diffMinutes < 1) return 'À l\'instant';
      if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Live Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0e1a]/95 border border-red-500/40 shadow-[0_0_25px_rgba(239,68,68,0.12)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 shadow-[0_0_10px_#ef4444]"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-100 uppercase tracking-wider font-mono">
                Fil d'Actualité en Direct
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/40 text-[10px] font-mono font-bold text-red-400">
                LIVE TICKER
              </span>
            </div>
            <p className="text-xs text-cyan-400/70 font-mono">
              Couverture minute par minute par les correspondants et journalistes accrédités.
            </p>
          </div>
        </div>

        {/* Filter tabs & Post button */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-[#07080f] rounded-xl p-1 border border-cyan-500/30 text-xs font-mono">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-cyan-400/60 hover:text-cyan-200'
              }`}
            >
              Tous ({updates.length})
            </button>
            <button
              onClick={() => setActiveFilter('urgent')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'urgent' ? 'bg-red-500/20 text-red-300 font-bold' : 'text-red-400/60 hover:text-red-200'
              }`}
            >
              🚨 Urgents
            </button>
            <button
              onClick={() => setActiveFilter('official')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'official' ? 'bg-blue-500/20 text-blue-300 font-bold' : 'text-blue-400/60 hover:text-blue-200'
              }`}
            >
              ⚡ Officiel
            </button>
          </div>

          {canPost && (
            <button
              onClick={() => setShowPostForm(!showPostForm)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-500 to-fuchsia-600 text-white font-mono text-xs font-bold hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Publier un Flash</span>
            </button>
          )}
        </div>
      </div>

      {/* Journalist Flash Publish Form */}
      {showPostForm && canPost && (
        <form
          onSubmit={handleCreateUpdate}
          className="p-4 rounded-2xl bg-[#0e1326] border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)] space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" /> Émettre une dépêche en direct
            </span>
            <button
              type="button"
              onClick={() => setShowPostForm(false)}
              className="text-xs font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Annuler
            </button>
          </div>

          <input
            type="text"
            required
            placeholder="Titre de la dépêche en direct..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#07080f] border border-cyan-500/40 text-slate-100 text-sm placeholder-cyan-400/40 focus:outline-hidden focus:border-red-400"
          />

          <textarea
            required
            rows={3}
            placeholder="Détails factuels minute par minute, éléments confirmés..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#07080f] border border-cyan-500/40 text-slate-100 text-sm placeholder-cyan-400/40 focus:outline-hidden focus:border-red-400"
          />

          <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-red-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="rounded border-red-500 accent-red-500"
                />
                <span>Urgence Flash (Alerte rouge)</span>
              </label>
              <label className="flex items-center gap-1.5 text-blue-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOfficial}
                  onChange={(e) => setIsOfficial(e.target.checked)}
                  className="rounded border-blue-500 accent-blue-500"
                />
                <span>Communication officielle</span>
              </label>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-[0_0_12px_rgba(239,68,68,0.5)] flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Diffuser maintenant</span>
            </button>
          </div>
        </form>
      )}

      {/* Timeline Stream */}
      <div className="relative pl-4 sm:pl-6 border-l-2 border-cyan-500/30 space-y-4 my-2">
        {filteredUpdates.map((item, idx) => (
          <div key={item.id} className="relative group">
            {/* Timeline node icon */}
            <div
              className={`absolute -left-[23px] sm:-left-[31px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                item.isUrgent
                  ? 'bg-red-950 border-red-500 shadow-[0_0_8px_#ef4444]'
                  : 'bg-[#07080f] border-cyan-400 shadow-[0_0_8px_#00f3ff]'
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${item.isUrgent ? 'bg-red-400' : 'bg-cyan-300'}`}
              />
            </div>

            {/* Event Card */}
            <div
              className={`p-4 rounded-2xl bg-[#0b0e1a]/95 border transition-all ${
                item.isUrgent
                  ? 'border-red-500/40 shadow-[0_0_18px_rgba(239,68,68,0.08)] hover:border-red-400'
                  : 'border-cyan-500/25 shadow-[0_0_15px_rgba(0,243,255,0.05)] hover:border-cyan-400/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap mb-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                      item.isUrgent
                        ? 'bg-red-950 text-red-400 border border-red-500/40'
                        : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    {item.category || 'Direct'}
                  </span>
                  {item.isOfficial && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-500/30 font-bold text-[10px] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Officiel
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-cyan-400/60 text-[11px]">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTime(item.timestamp)}</span>
                  <span className="hidden sm:inline text-cyan-500/40">
                    ({new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})
                  </span>
                </div>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-cyan-200 transition-colors mb-1.5">
                {item.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                {item.content}
              </p>

              <div className="mt-3 pt-2.5 border-t border-cyan-500/15 flex items-center justify-between text-[11px] font-mono text-cyan-400/60">
                <span className="flex items-center gap-1">
                  Correspondant : <strong className="text-slate-200">{item.authorName}</strong>
                </span>
                <span className="text-cyan-500/40">#purge-direct</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
