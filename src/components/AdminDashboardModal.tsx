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
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  onClose,
  onRefreshData,
  onPreviewArticle,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-7xl h-[94vh] bg-stone-50 dark:bg-stone-900 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col border border-stone-200 dark:border-stone-800 overflow-hidden transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Flash Notification Toast */}
        {flash && (
          <div className="absolute top-4 right-4 z-50 px-4 py-2.5 bg-gray-900 dark:bg-stone-800 text-white text-xs font-semibold rounded-xl shadow-lg border border-gray-700 dark:border-stone-700 flex items-center gap-2 animate-slideDown">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{flash}</span>
          </div>
        )}

        {/* Modal Top Header */}
        <div className="px-5 py-3.5 bg-white dark:bg-stone-850 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-stone-100 tracking-tight">
                  Administration & Modération
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300">
                  Accès Restreint
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-stone-400">
                Supervision éditoriale, gestion des accréditations CSC et traçabilité d'audit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGlobalRefresh}
              disabled={loading}
              title="Actualiser les données"
              className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-750 hover:text-stone-900 dark:hover:text-stone-100 transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              aria-label="Fermer la console d'administration"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-white dark:bg-stone-850 border-b border-stone-200 dark:border-stone-800 px-4 flex items-center gap-1 overflow-x-auto shrink-0 scrollbar-none transition-colors">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-stone-400 hover:text-gray-900 dark:hover:text-stone-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Vue d'ensemble
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'users'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-stone-400 hover:text-gray-900 dark:hover:text-stone-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Utilisateurs
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-stone-750 text-gray-600 dark:text-stone-300 font-semibold">
              {usersList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('journalists')}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'journalists'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-stone-400 hover:text-gray-900 dark:hover:text-stone-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Journalistes & Accréditations
            {pendingVerifsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold animate-pulse">
                {pendingVerifsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'media'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-stone-400 hover:text-gray-900 dark:hover:text-stone-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Médias & Rédactions
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-stone-750 text-gray-600 dark:text-stone-300 font-semibold">
              {mediaHouses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('media_assets')}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'media_assets'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-stone-400 hover:text-gray-900 dark:hover:text-stone-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Médiathèque Cloud
          </button>

          <button
            onClick={() => setActiveTab('articles')}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'articles'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-stone-400 hover:text-gray-900 dark:hover:text-stone-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Articles
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-stone-750 text-gray-600 dark:text-stone-300 font-semibold">
              {articles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'comments'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-stone-400 hover:text-gray-900 dark:hover:text-stone-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Commentaires
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'reports'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-stone-400 hover:text-gray-900 dark:hover:text-stone-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Signalements
            {pendingReportsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-bold animate-pulse">
                {pendingReportsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'categories'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-stone-400 hover:text-gray-900 dark:hover:text-stone-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Rubriques
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-stone-750 text-gray-600 dark:text-stone-300 font-semibold">
              {categories.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-stone-400 hover:text-gray-900 dark:hover:text-stone-200'
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
