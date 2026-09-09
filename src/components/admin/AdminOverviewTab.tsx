import React from 'react';
import {
  Users,
  Shield,
  Building2,
  FileText,
  Eye,
  MessageSquare,
  Heart,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { PlatformStats } from '../../types';

interface AdminOverviewTabProps {
  stats: PlatformStats | null;
  onNavigateTab: (tab: 'users' | 'journalists' | 'media' | 'articles' | 'comments' | 'reports' | 'categories' | 'logs') => void;
}

const CATEGORY_COLORS = ['#059669', '#2563EB', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#4B5563'];

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  stats,
  onNavigateTab,
}) => {
  if (!stats) {
    return (
      <div className="flex items-center justify-center p-16 text-gray-500">
        Chargement des indicateurs...
      </div>
    );
  }

  const categoryData = (stats.articlesByCategory || []).map((cat) => ({
    name: cat.name,
    articles: cat.count,
  }));

  const statusData = [
    { name: 'Publiés', value: stats.publishedArticles || 0, color: '#10B981' },
    { name: 'Brouillons', value: stats.draftArticles || 0, color: '#F59E0B' },
    { name: 'Masqués', value: stats.hiddenArticles || 0, color: '#EF4444' },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Alert Banners if pending items need review */}
      {(stats.pendingReports > 0 || stats.pendingVerifications > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.pendingReports > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-900">
                    {stats.pendingReports} signalement(s) en attente
                  </h4>
                  <p className="text-xs text-red-700">Contenus signalés par la communauté à modérer</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('reports')}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm transition"
              >
                Traiter
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {stats.pendingVerifications > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">
                    {stats.pendingVerifications} demande(s) de badge presse
                  </h4>
                  <p className="text-xs text-amber-700">Cartes de presse soumises à authentifier</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('journalists')}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm transition"
              >
                Vérifier
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('users')}
          className="p-5 bg-white border border-gray-100 hover:border-emerald-200 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisateurs</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.totalUsers}</div>
          <p className="text-xs text-emerald-600 font-medium mt-1">Comptes enregistrés</p>
        </div>

        <div
          onClick={() => onNavigateTab('journalists')}
          className="p-5 bg-white border border-gray-100 hover:border-blue-200 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Journalistes</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.totalJournalists}</div>
          <p className="text-xs text-blue-600 font-medium mt-1">Accrédités & vérifiés</p>
        </div>

        <div
          onClick={() => onNavigateTab('media')}
          className="p-5 bg-white border border-gray-100 hover:border-blue-200 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Médias</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.totalMedia}</div>
          <p className="text-xs text-blue-600 font-medium mt-1">Maisons de presse</p>
        </div>

        <div
          onClick={() => onNavigateTab('articles')}
          className="p-5 bg-white border border-gray-100 hover:border-amber-200 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Articles</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.totalArticles}</div>
          <p className="text-xs text-amber-600 font-medium mt-1">{stats.publishedArticles} publiés</p>
        </div>

        <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lectures</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.totalViews.toLocaleString('fr-FR')}</div>
          <p className="text-xs text-indigo-600 font-medium mt-1">Vues cumulées</p>
        </div>

        <div
          onClick={() => onNavigateTab('comments')}
          className="p-5 bg-white border border-gray-100 hover:border-emerald-200 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Commentaires</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.totalComments}</div>
          <p className="text-xs text-emerald-600 font-medium mt-1">Discussions actives</p>
        </div>

        <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mentions J’aime</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.totalLikes}</div>
          <p className="text-xs text-rose-600 font-medium mt-1">Interactions positives</p>
        </div>

        <div
          onClick={() => onNavigateTab('reports')}
          className="p-5 bg-white border border-gray-100 hover:border-red-200 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Signalements</span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.pendingReports}</div>
          <p className="text-xs text-red-600 font-medium mt-1">À examiner</p>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Articles by Category Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Articles par rubrique</h3>
              <p className="text-xs text-gray-500">Distribution thématique des articles publiés</p>
            </div>
            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
              Données réelles
            </span>
          </div>

          <div className="h-64 w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      borderRadius: '12px',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="articles" fill="#059669" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                Aucun article publié pour le moment
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Statut éditorial</h3>
                <p className="text-xs text-gray-500">Répartition des publications</p>
              </div>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>

            <div className="h-44 w-full relative flex items-center justify-center">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        borderRadius: '12px',
                        color: '#fff',
                        border: 'none',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-gray-400">Aucune donnée</div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Publiés
              </span>
              <span className="font-bold text-gray-900">{stats.publishedArticles}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Brouillons
              </span>
              <span className="font-bold text-gray-900">{stats.draftArticles}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Masqués
              </span>
              <span className="font-bold text-gray-900">{stats.hiddenArticles}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real Activity Stream */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <h3 className="text-base font-bold text-gray-900">Activité récente de la plateforme</h3>
          </div>
          <button
            onClick={() => onNavigateTab('logs')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Consulter le journal d’audit complet →
          </button>
        </div>

        {stats.recentActivity && stats.recentActivity.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {stats.recentActivity.map((item) => (
              <div key={item.id} className="py-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase shrink-0 ${
                      item.type === 'article'
                        ? 'bg-emerald-50 text-emerald-700'
                        : item.type === 'report'
                        ? 'bg-red-50 text-red-700'
                        : item.type === 'verification'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {item.type === 'article'
                      ? 'Article'
                      : item.type === 'report'
                      ? 'Signalement'
                      : item.type === 'verification'
                      ? 'Accréditation'
                      : 'Utilisateur'}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 leading-snug">{item.title}</h4>
                    <p className="text-xs text-gray-500">{item.subtitle}</p>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">
                  {new Date(item.timestamp).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-6 text-center">Aucune activité enregistrée récemment.</p>
        )}
      </div>
    </div>
  );
};
