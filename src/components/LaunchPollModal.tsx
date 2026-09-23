import React, { useState, useEffect } from 'react';
import {
  Vote,
  X,
  Plus,
  Trash2,
  Sparkles,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  Zap,
} from 'lucide-react';
import { Article, Poll } from '../types';
import { api } from '../services/api';
import { sfx } from '../services/soundEffects';

interface LaunchPollModalProps {
  isOpen: boolean;
  onClose: () => void;
  myArticles: Article[];
  preselectedArticleId?: string;
  onSuccess: (poll: Poll, article: Article) => void;
}

const PRESET_TEMPLATES = [
  {
    label: 'Pour / Contre',
    options: ['Pour', 'Contre', 'Sans avis / Neutre'],
  },
  {
    label: 'Oui / Non',
    options: ['Oui', 'Non', 'Indécis(e)'],
  },
  {
    label: 'Approbation',
    options: ['Très favorable', 'Plutôt favorable', 'Défavorable', 'Très hostile'],
  },
  {
    label: 'Sécurité & Libertés',
    options: ['Priorité à la sécurité', 'Priorité aux libertés', 'Équilibre strict'],
  },
];

export const LaunchPollModal: React.FC<LaunchPollModalProps> = ({
  isOpen,
  onClose,
  myArticles,
  preselectedArticleId,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'existing' | 'quick_launch'>(
    preselectedArticleId || myArticles.length > 0 ? 'existing' : 'quick_launch'
  );
  const [selectedArticleId, setSelectedArticleId] = useState<string>(
    preselectedArticleId || (myArticles[0]?.id ?? '')
  );

  // Poll form fields
  const [question, setQuestion] = useState<string>('');
  const [options, setOptions] = useState<string[]>(['Pour', 'Contre', 'Sans opinion']);
  const [duration, setDuration] = useState<string>('never'); // never, 24h, 48h, 7d

  // Quick launch flash article fields
  const [flashTitle, setFlashTitle] = useState<string>('');
  const [flashContext, setFlashContext] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedArticleId) {
      setSelectedArticleId(preselectedArticleId);
      setMode('existing');
    } else if (myArticles.length > 0 && !selectedArticleId) {
      setSelectedArticleId(myArticles[0].id);
    }
  }, [preselectedArticleId, myArticles]);

  if (!isOpen) return null;

  const handleApplyPreset = (presetOptions: string[]) => {
    setOptions([...presetOptions]);
    sfx.playClick();
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
      sfx.playClick();
    }
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
      sfx.playClick();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanQ = question.trim();
    if (cleanQ.length < 5) {
      setErrorMsg('La question du sondage doit comporter au moins 5 caractères.');
      return;
    }

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setErrorMsg('Veuillez renseigner au moins 2 options valides de vote.');
      return;
    }

    // Expiration calculation
    let expiresAt: string | undefined = undefined;
    if (duration === '24h') {
      expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    } else if (duration === '48h') {
      expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    } else if (duration === '7d') {
      expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    }

    setLoading(true);
    try {
      if (mode === 'existing') {
        if (!selectedArticleId) {
          setErrorMsg('Veuillez sélectionner un article sur lequel greffer le sondage.');
          setLoading(false);
          return;
        }

        const res = await api.launchArticlePoll(selectedArticleId, {
          question: cleanQ,
          options: cleanOptions,
          expiresAt,
        });

        sfx.playVote();
        onSuccess(res.poll, res.article);
        onClose();
      } else {
        // Quick Launch standalone Flash Article with poll
        const res = await api.quickLaunchPoll({
          question: cleanQ,
          options: cleanOptions,
          title: flashTitle.trim() || undefined,
          context: flashContext.trim() || undefined,
          expiresAt,
        });

        sfx.playVote();
        onSuccess(res.poll, res.article);
        onClose();
      }
    } catch (err: any) {
      console.error('Error launching poll:', err);
      setErrorMsg(err.message || 'Impossible de lancer le sondage.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="launch-poll-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        id="launch-poll-modal-container"
        className="relative w-full max-w-2xl bg-[#090d1a] border border-cyan-500/40 rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(0,243,255,0.25)] overflow-hidden flex flex-col max-h-[92vh] animate-fadeIn"
      >
        {/* Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-[#0d1326] via-[#141b38] to-[#0d1326] border-b border-cyan-500/30 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/30 shrink-0">
              <div className="w-full h-full bg-[#080c18] rounded-[14px] flex items-center justify-center">
                <Vote className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white font-sans">
                  Lancer un Sondage d'Opinion
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-mono shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                  Journaliste
                </span>
              </div>
              <p className="text-xs text-cyan-300/70 mt-0.5 font-mono">
                Consultez les citoyens en direct avec graphiques interactifs et dépouillement en temps réel.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-cyan-400/60 hover:text-cyan-200 hover:bg-cyan-500/20 rounded-xl transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 font-sans">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#101428] rounded-xl border border-cyan-500/25 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('existing');
                sfx.playClick();
              }}
              className={`py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'existing'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_12px_rgba(0,243,255,0.4)]'
                  : 'text-cyan-400/70 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Sur un article existant</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('quick_launch');
                sfx.playClick();
              }}
              className={`py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'quick_launch'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_12px_rgba(0,243,255,0.4)]'
                  : 'text-cyan-400/70 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Sondage Flash Express</span>
            </button>
          </div>

          {/* Mode 1: Select Existing Article */}
          {mode === 'existing' ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                Sélectionner l'article support <span className="text-red-400">*</span>
              </label>
              {myArticles.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs">
                  Vous n'avez pas encore d'article publié. Passez en mode{' '}
                  <strong className="text-white underline cursor-pointer" onClick={() => setMode('quick_launch')}>
                    « Sondage Flash Express »
                  </strong>{' '}
                  pour lancer votre consultation instantanément.
                </div>
              ) : (
                <select
                  value={selectedArticleId}
                  onChange={(e) => setSelectedArticleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#101428] border border-cyan-500/40 rounded-xl focus:outline-none focus:border-cyan-400 text-white font-mono"
                >
                  {myArticles.map((art) => (
                    <option key={art.id} value={art.id}>
                      {art.title} {art.poll ? '(⚠️ Remplacer le sondage actuel)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            /* Mode 2: Flash Article Config */
            <div className="space-y-3 p-4 rounded-xl bg-[#101428]/80 border border-cyan-500/30">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Publication instantanée d'une consultation flash</span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-cyan-400 font-mono mb-1">
                  Titre du reportage / consultation (facultatif)
                </label>
                <input
                  type="text"
                  value={flashTitle}
                  onChange={(e) => setFlashTitle(e.target.value)}
                  placeholder="Ex: Débat public : Quelle régulation pour l'intelligence artificielle ?"
                  className="w-full px-3 py-2 text-xs bg-[#090d1a] border border-cyan-500/40 rounded-xl focus:outline-none focus:border-cyan-400 text-white"
                  maxLength={120}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-cyan-400 font-mono mb-1">
                  Contexte éditorial pour les votants (facultatif)
                </label>
                <textarea
                  rows={2}
                  value={flashContext}
                  onChange={(e) => setFlashContext(e.target.value)}
                  placeholder="Quelques lignes pour éclairer les citoyens sur les enjeux du scrutin..."
                  className="w-full px-3 py-2 text-xs bg-[#090d1a] border border-cyan-500/40 rounded-xl focus:outline-none focus:border-cyan-400 text-white resize-none"
                  maxLength={600}
                />
              </div>
            </div>
          )}

          {/* Question Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
              <label>
                Question posée aux citoyens <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-cyan-400/60">{question.length}/200</span>
            </div>
            <input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: Êtes-vous favorable au renforcement des contrôles éditoriaux sur les réseaux ?"
              className="w-full px-3.5 py-2.5 text-xs bg-[#101428] border border-cyan-500/40 rounded-xl focus:outline-none focus:border-cyan-400 text-white placeholder:text-stone-500 font-sans"
              maxLength={200}
            />
          </div>

          {/* Presets Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-cyan-300 font-mono font-bold">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Modèles de réponses rapides :</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.label}
                  type="button"
                  onClick={() => handleApplyPreset(tmpl.options)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-cyan-950/70 border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-900/60 text-cyan-300 transition cursor-pointer"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options Inputs */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
              Choix de réponse ({options.length}/6)
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    required
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 px-3 py-2 text-xs bg-[#101428] border border-cyan-500/40 rounded-xl focus:outline-none focus:border-cyan-400 text-white font-sans"
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                      title="Supprimer cette option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 6 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 hover:border-cyan-400 rounded-lg transition font-mono cursor-pointer mt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une option supplémentaire</span>
              </button>
            )}
          </div>

          {/* Validity Duration */}
          <div className="space-y-1.5 pt-2 border-t border-cyan-500/20 font-mono">
            <label className="block text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Durée du scrutin</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { id: 'never', label: 'Permanent' },
                { id: '24h', label: 'Flash 24h' },
                { id: '48h', label: '48 heures' },
                { id: '7d', label: '7 jours' },
              ].map((dur) => (
                <button
                  key={dur.id}
                  type="button"
                  onClick={() => setDuration(dur.id)}
                  className={`py-2 px-2.5 rounded-xl border text-center transition font-bold cursor-pointer ${
                    duration === dur.id
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                      : 'bg-[#101428] border-cyan-500/20 text-cyan-400/60 hover:text-cyan-200'
                  }`}
                >
                  {dur.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Box */}
          {question.trim() && options.filter((o) => o.trim()).length >= 2 && (
            <div className="p-4 rounded-2xl bg-[#060a17] border border-cyan-500/40 space-y-3 font-sans">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-cyan-400">
                <span className="flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5" /> Aperçu du widget pour les lecteurs :
                </span>
                <span className="text-amber-400 font-bold">0 votes</span>
              </div>
              <h4 className="text-sm font-bold text-white leading-snug">{question.trim()}</h4>
              <div className="space-y-2">
                {options.filter((o) => o.trim()).map((opt, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#0f142c] border border-cyan-500/30 flex items-center justify-between text-xs text-white"
                  >
                    <span>{opt}</span>
                    <span className="text-[11px] font-mono text-cyan-400">0%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-cyan-500/30 flex items-center justify-end gap-3 font-mono">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-cyan-300 hover:text-white transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:brightness-110 text-slate-950 font-black text-xs rounded-xl shadow-[0_0_20px_rgba(0,243,255,0.4)] transition cursor-pointer disabled:opacity-50"
            >
              <Vote className="w-4 h-4" />
              <span>{loading ? 'Lancement du scrutin...' : 'Lancer le Sondage en Direct'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
