import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Shield,
  Clock,
  User,
  Building2,
  MessageSquare,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { AdminLog } from '../../types';
import { api } from '../../services/api';

interface AdminLogsTabProps {
  onFlash: (msg: string) => void;
}

export const AdminLogsTab: React.FC<AdminLogsTabProps> = ({ onFlash }) => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminLogs({
        q: search.trim() || undefined,
        targetType: targetTypeFilter !== 'all' ? targetTypeFilter : undefined,
        limit: 100,
      });
      setLogs(res.logs);
    } catch (err: any) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [targetTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const getActionBadge = (action: string) => {
    if (action.includes('suspend') || action.includes('delete') || action.includes('hide')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (action.includes('approve') || action.includes('restore') || action.includes('create')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Info */}
      <div className="p-4 bg-gray-900 text-white rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Journal d’Audit Immuable</h3>
            <p className="text-xs text-gray-400">
              Traçabilité inaltérable de toutes les opérations sensibles exécutées par les administrateurs.
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par admin, cible, motif..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </form>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">Filtrer par cible :</span>
          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-2.5 py-1.5 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Toutes les cibles</option>
            <option value="user">Utilisateurs</option>
            <option value="journalist">Journalistes & Accréditations</option>
            <option value="media">Maisons de presse</option>
            <option value="article">Articles</option>
            <option value="comment">Commentaires</option>
            <option value="category">Rubriques</option>
            <option value="report">Signalements</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase">
              <tr>
                <th className="py-3 px-4">Date & Heure</th>
                <th className="py-3 px-4">Administrateur</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Cible</th>
                <th className="py-3 px-4">Détails / Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                    Chargement du journal d’audit...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                    Aucun événement d’audit enregistré pour ces filtres.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition text-xs">
                    <td className="py-3 px-4 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                      {new Date(log.createdAt || log.timestamp).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{log.adminName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{log.adminEmail || log.adminId}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-800">
                        {log.targetTitle || log.targetId || '-'}
                      </div>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                        Type: {log.targetType}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      {log.details ? (
                        <span className="text-gray-600 line-clamp-2" title={log.details}>
                          {log.details}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
