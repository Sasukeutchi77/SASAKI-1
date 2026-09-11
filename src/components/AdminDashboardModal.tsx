import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  LayoutDashboard,
  Users,
  FileCheck,
  Building2,
  FileText,
  MessageSquare,
  AlertTriangle,
  Layers,
  History,
  RotateCcw,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { PlatformStats, User, VerificationRequest, Report, Article, Category, MediaHouse } from '../types';
import { api } from '../services/api';
import { AdminOverviewTab } from './admin/AdminOverviewTab';
import { AdminUsersTab } from './admin/AdminUsersTab';
import { AdminJournalistsTab } from './admin/AdminJournalistsTab';
import { AdminMediaTab } from './admin/AdminMediaTab';
import { AdminArticlesTab } from './admin/AdminArticlesTab';
import { AdminCommentsTab } from './admin/AdminCommentsTab';
import { AdminReportsTab } from './admin/AdminReportsTab';
import { AdminCategoriesTab } from './admin/AdminCategoriesTab';
import { AdminLogsTab } from './admin/AdminLogsTab';
import { AdminMediaAssetsTab } from './admin/AdminMediaAssetsTab';
import { realtime } from '../services/realtime';

export type AdminTab =
  | 'overview'
  | 'users'
  | 'journalists'
  | 'media'
  | 'media_assets'
  | 'articles'
  | 'comments'
  | 'reports'
  | 'categories'
  | 'logs';

interface AdminDashboardModalProps {
  onClose: () => void;
  onRefreshData?: () => void;
  onPreviewArticle?: (article: Article) => void;
  initialTab?: AdminTab;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  onClose,
  onRefreshData,
  onPreviewArticle,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab || 'overview');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [usersList, setUsersList] = useState<(User & { articlesCount: number })[]>([]);
  const [verifRequests, setVerifRequests] = useState<VerificationRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mediaHouses, setMediaHouses] = useState<MediaHouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [sRes, uRes, vRes, rRes, aRes, cRes, mRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminVerificationRequests(),
        api.getAdminReports(),
        api.getAdminArticles(),
        api.getCategories(),
        api.getAdminMedia(),
      ]);
      setStats(sRes.stats);
      setUsersList(uRes.users);
      setVerifRequests(vRes.requests);
      setReports(rRes.reports);
      setArticles(aRes.articles);
      setCategories(cRes.categories);
      setMediaHouses(mRes.mediaHouses);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      showFlash(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Real-time listener for incoming verification requests
  useEffect(() => {
    const unsubCreated = realtime.on<VerificationRequest>('verification:created', (newReq) => {
      setVerifRequests((prev) => {
        if (prev.some((r) => r.id === newReq.id)) return prev;
        return [newReq, ...prev];
      });
      showFlash(`Nouvelle demande d’accréditation reçue : ${newReq.userName} (${newReq.mediaName || 'Journaliste'})`);
    });

    const unsubUpdated = realtime.on<VerificationRequest>('verification:updated', (updatedReq) => {
      setVerifRequests((prev) => prev.map((r) => (r.id === updatedReq.id ? updatedReq : r)));
    });

    return () => {
      unsubCreated();
      unsubUpdated();
    };
  }, []);

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3500);
  };

  const handleGlobalRefresh = () => {
    loadAllData();
    if (onRefreshData) onRefreshData();
  };

  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;
  const pendingVerifsCount = verifRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-7xl h-[94vh] bg-[#0b0e1a] rounded-2xl md:rounded-3xl shadow-[0_0_50px_rgba(0,243,255,0.25)] flex flex-col border border-cyan-500/40 overflow-hidden transition-all text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Flash Notification Toast */}
        {flash && (
          <div className="absolute top-4 right-4 z-50 px-4 py-2.5 bg-[#141933] text-cyan-300 text-xs font-mono font-semibold rounded-xl shadow-[0_0_15px_rgba(0,243,255,0.3)] border border-cyan-500/40 flex items-center gap-2 animate-slideDown">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{flash}</span>
          </div>
        )}

        {/* Modal Top Header */}
        <div className="px-5 py-3.5 bg-[#101428] border-b border-cyan-500/30 flex items-center justify-between shrink-0 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#141933] border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-[0_0_12px_rgba(0,243,255,0.25)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black font-mono text-white tracking-tight">
                  Administration & Modération
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider bg-red-950/70 border border-red-500/40 text-red-300">
                  Accès Restreint
                </span>
              </div>
              <p className="text-xs text-cyan-400/60 font-mono">
                Supervision éditoriale, gestion des accréditations CSC et traçabilité d'audit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGlobalRefresh}
              disabled={loading}
              title="Actualiser les données"
              className="p-2 rounded-xl bg-[#141933] border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 hover:text-white transition flex items-center gap-1.5 text-xs font-mono font-medium cursor-pointer"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-cyan-400/60 hover:text-cyan-200 hover:bg-cyan-500/20 transition cursor-pointer"
              aria-label="Fermer la console d'administration"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-[#0e1224] border-b border-cyan-500/30 px-4 flex items-center gap-1 overflow-x-auto shrink-0 scrollbar-none transition-all">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 text-xs font-bold font-mono whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(0,243,255,0.4)]'
                : 'border-transparent text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Vue d'ensemble
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-3.5 text-xs font-bold font-mono whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'users'
                ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(0,243,255,0.4)]'
                : 'border-transparent text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Utilisateurs
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#141933] border border-cyan-500/30 text-cyan-300 font-semibold font-mono">
              {usersList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('journalists')}
            className={`py-3 px-3.5 text-xs font-bold font-mono whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'journalists'
                ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(0,243,255,0.4)]'
                : 'border-transparent text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Journalistes & Accréditations
            {pendingVerifsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold font-mono animate-pulse">
                {pendingVerifsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`py-3 px-3.5 text-xs font-bold font-mono whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'media'
                ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(0,243,255,0.4)]'
                : 'border-transparent text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Médias & Rédactions
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#141933] border border-cyan-500/30 text-cyan-300 font-semibold font-mono">
              {mediaHouses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('media_assets')}
            className={`py-3 px-3.5 text-xs font-bold font-mono whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'media_assets'
                ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(0,243,255,0.4)]'
                : 'border-transparent text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Médiathèque Cloud
          </button>

          <button
            onClick={() => setActiveTab('articles')}
            className={`py-3 px-3.5 text-xs font-bold font-mono whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'articles'
                ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(0,243,255,0.4)]'
                : 'border-transparent text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Articles
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#141933] border border-cyan-500/30 text-cyan-300 font-semibold font-mono">
              {articles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`py-3 px-3.5 text-xs font-bold font-mono whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'comments'
                ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(0,243,255,0.4)]'
                : 'border-transparent text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Commentaires
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`py-3 px-3.5 text-xs font-bold font-mono whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'reports'
                ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(0,243,255,0.4)]'
                : 'border-transparent text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Signalements
            {pendingReportsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-950/80 border border-red-500/40 text-red-300 font-bold font-mono animate-pulse">
                {pendingReportsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`py-3 px-3.5 text-xs font-bold font-mono whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'categories'
                ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(0,243,255,0.4)]'
                : 'border-transparent text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Rubriques
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#141933] border border-cyan-500/30 text-cyan-300 font-semibold font-mono">
              {categories.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-3.5 text-xs font-bold font-mono whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(0,243,255,0.4)]'
                : 'border-transparent text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            <History className="w-4 h-4" />
            Journal d’audit
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {activeTab === 'overview' && (
            <AdminOverviewTab
              stats={stats}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'users' && (
            <AdminUsersTab
              users={usersList}
              onRefresh={handleGlobalRefresh}
              onFlash={showFlash}
            />
          )}

          {activeTab === 'journalists' && (
            <AdminJournalistsTab
              requests={verifRequests}
              users={usersList}
              onRefresh={handleGlobalRefresh}
              onFlash={showFlash}
            />
          )}

          {activeTab === 'media' && (
            <AdminMediaTab
              mediaHouses={mediaHouses}
              onRefresh={handleGlobalRefresh}
              onFlash={showFlash}
            />
          )}

          {activeTab === 'media_assets' && (
            <AdminMediaAssetsTab
              onFlash={showFlash}
            />
          )}

          {activeTab === 'articles' && (
            <AdminArticlesTab
              articles={articles}
              categories={categories}
              onRefresh={handleGlobalRefresh}
              onFlash={showFlash}
              onPreviewArticle={onPreviewArticle}
            />
          )}

          {activeTab === 'comments' && (
            <AdminCommentsTab
              onFlash={showFlash}
            />
          )}

          {activeTab === 'reports' && (
            <AdminReportsTab
              reports={reports}
              onRefresh={handleGlobalRefresh}
              onFlash={showFlash}
            />
          )}

          {activeTab === 'categories' && (
            <AdminCategoriesTab
              categories={categories}
              onRefresh={handleGlobalRefresh}
              onFlash={showFlash}
            />
          )}

          {activeTab === 'logs' && (
            <AdminLogsTab
              onFlash={showFlash}
            />
          )}
        </div>
      </div>
    </div>
  );
};
