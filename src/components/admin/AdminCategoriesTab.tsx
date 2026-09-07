import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Ban,
  Search,
  RotateCcw,
} from 'lucide-react';
import { Category } from '../../types';
import { api } from '../../services/api';
import { AdminConfirmDialog } from './AdminConfirmDialog';

interface AdminCategoriesTabProps {
  categories: Category[];
  onRefresh: () => void;
  onFlash: (msg: string) => void;
}

export const AdminCategoriesTab: React.FC<AdminCategoriesTabProps> = ({
  categories,
  onRefresh,
  onFlash,
}) => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Layers');
  const [status, setStatus] = useState<'active' | 'disabled'>('active');
  const [order, setOrder] = useState(0);

  // Delete dialog
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const filteredCategories = categories.filter((c) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
    }
    return true;
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setIcon('Layers');
    setStatus('active');
    setOrder(categories.length + 1);
    setShowModal(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setIcon(cat.icon || 'Layers');
    setStatus(cat.status || 'active');
    setOrder(cat.order || 0);
    setShowModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onFlash('Le nom de la rubrique est obligatoire.');
      return;
    }
    setLoadingAction(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        description: description.trim() || undefined,
        icon: icon.trim() || 'Layers',
        status,
        order: Number(order) || 0,
      };

      if (editingCategory) {
        await api.updateAdminCategory(editingCategory.id, payload);
        onFlash(`Rubrique "${name}" mise à jour avec succès.`);
      } else {
        await api.createAdminCategory(payload);
        onFlash(`Rubrique "${name}" créée avec succès.`);
      }
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      onFlash(`Erreur: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleStatus = async (cat: Category) => {
    const nextStatus = cat.status === 'disabled' ? 'active' : 'disabled';
    try {
      await api.updateAdminCategory(cat.id, { status: nextStatus });
      onFlash(`Rubrique "${cat.name}" ${nextStatus === 'disabled' ? 'désactivée' : 'activée'}.`);
      onRefresh();
    } catch (err: any) {
      onFlash(`Erreur: ${err.message}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setLoadingAction(true);
    try {
      await api.deleteAdminCategory(categoryToDelete.id);
      onFlash(`Rubrique "${categoryToDelete.name}" supprimée.`);
      setCategoryToDelete(null);
      onRefresh();
    } catch (err: any) {
      onFlash(`Erreur: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher une rubrique..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <button
          onClick={openCreateModal}
          className="w-full md:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Rubrique
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase">
              <tr>
                <th className="py-3 px-4">Ordre</th>
                <th className="py-3 px-4">Rubrique</th>
                <th className="py-3 px-4">Identifiant (Slug)</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Articles associés</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCategories.map((c) => {
                const isDisabled = c.status === 'disabled';
                return (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-4 text-xs font-mono text-gray-500 font-bold">
                      #{c.order || 0}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{c.name}</div>
                      {c.description && <div className="text-xs text-gray-400 line-clamp-1">{c.description}</div>}
                    </td>

                    <td className="py-3 px-4 text-xs font-mono text-gray-600">
                      /{c.slug}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isDisabled ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isDisabled ? 'bg-gray-400' : 'bg-emerald-500'}`} />
                        {isDisabled ? 'Désactivée' : 'Active'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-xs font-bold text-gray-700">
                      {c.articleCount || 0}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleStatus(c)}
                          title={isDisabled ? 'Activer la rubrique' : 'Désactiver la rubrique'}
                          className={`p-1.5 rounded-lg border transition ${
                            isDisabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {isDisabled ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => openEditModal(c)}
                          title="Modifier"
                          className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setCategoryToDelete(c)}
                          title="Supprimer"
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {editingCategory ? 'Modifier la rubrique' : 'Nouvelle rubrique'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nom de la rubrique *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Économie, Sécurité, Culture..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Identifiant (slug)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="Ex: economie"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ordre d'affichage</label>
                  <input
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description courte</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Présentation des sujets traités..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Statut :</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="active">Active (visible au public)</option>
                  <option value="disabled">Désactivée (invisible)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-sm"
                >
                  {loadingAction ? 'Enregistrement...' : editingCategory ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={!!categoryToDelete}
        title="Supprimer cette rubrique ?"
        message={`Attention : Si des articles sont associés à la rubrique "${categoryToDelete?.name}", la suppression sera refusée pour préserver l’intégrité des publications.`}
        confirmLabel={loadingAction ? 'Suppression...' : 'Supprimer'}
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
};
