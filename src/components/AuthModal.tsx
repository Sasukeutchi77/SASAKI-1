import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, initialMode = 'login' }) => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword, quickSwitch, isFirebaseActive } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (mode === 'forgot') {
      if (!email.trim()) {
        setError('Veuillez saisir votre adresse email.');
        return;
      }
      setLoading(true);
      try {
        await resetPassword(email.trim());
        setSuccessMessage('Un email de réinitialisation a été envoyé à votre adresse.');
      } catch (err: any) {
        setError(err.message || 'Impossible d’envoyer l’email de réinitialisation.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Veuillez renseigner votre nom complet.');
        return;
      }
      if (password.length < 6) {
        setError('Le mot de passe doit comporter au moins 6 caractères.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Les deux mots de passe ne correspondent pas.');
        return;
      }
      setLoading(true);
      try {
        await registerWithEmail(name.trim(), email.trim(), password);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la création du compte.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'login') {
      if (!email.trim() || !password) {
        setError('Veuillez renseigner votre email et mot de passe.');
        return;
      }
      setLoading(true);
      try {
        await loginWithEmail(email.trim(), password);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Identifiants invalides.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Échec de la connexion avec Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDemoSwitch = async (roleKey: 'admin' | 'burkinanews' | 'salif' | 'aminata') => {
    setLoading(true);
    try {
      await quickSwitch(roleKey);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-4 max-h-[92vh] transition-colors">
        {/* Modal Header */}
        <div className="bg-stone-50 dark:bg-stone-850 border-b border-stone-200 dark:border-stone-800 px-6 py-4 flex items-center justify-between shrink-0 transition-colors">
          <div>
            <h2 className="text-lg font-black text-stone-900 dark:text-stone-100">
              {mode === 'login' && 'Connexion à purge-info'}
              {mode === 'register' && 'Créer un compte citoyen purge-info'}
              {mode === 'forgot' && 'Réinitialiser votre mot de passe'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {mode === 'login' && 'Accédez à vos lectures, favoris et débats'}
              {mode === 'register' && 'Rejoignez la communauté d’information vérifiée'}
              {mode === 'forgot' && 'Recevez les instructions par courrier électronique'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Fast Switch Toolbar */}
        <div className="px-6 py-3 bg-stone-100/80 dark:bg-stone-850/80 border-b border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Comptes Démo Préconfigurés :
            </span>
            {isFirebaseActive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded-sm border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Firebase Live
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <button
              type="button"
              onClick={() => handleDemoSwitch('aminata')}
              className="px-2 py-1 bg-white dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-stone-800 dark:text-stone-200 text-[11px] font-bold rounded-lg border border-stone-200 dark:border-stone-700 transition-colors shadow-2xs cursor-pointer"
            >
              Lecteur
            </button>
            <button
              type="button"
              onClick={() => handleDemoSwitch('salif')}
              className="px-2 py-1 bg-white dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-stone-800 dark:text-stone-200 text-[11px] font-bold rounded-lg border border-stone-200 dark:border-stone-700 transition-colors shadow-2xs cursor-pointer"
            >
              Journaliste
            </button>
            <button
              type="button"
              onClick={() => handleDemoSwitch('burkinanews')}
              className="px-2 py-1 bg-white dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-stone-800 dark:text-stone-200 text-[11px] font-bold rounded-lg border border-stone-200 dark:border-stone-700 transition-colors shadow-2xs cursor-pointer"
            >
              Média
            </button>
            <button
              type="button"
              onClick={() => handleDemoSwitch('admin')}
              className="px-2 py-1 bg-white dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-stone-800 dark:text-stone-200 text-[11px] font-bold rounded-lg border border-stone-200 dark:border-stone-700 transition-colors shadow-2xs cursor-pointer"
            >
              Admin
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-start gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Google Official Auth Button */}
          {mode !== 'forgot' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={googleLoading || loading}
                className="w-full py-2.5 px-4 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
              >
                {/* Official Google G SVG icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{googleLoading ? 'Connexion en cours...' : 'Continuer avec Google'}</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-stone-200 dark:border-stone-800 w-full"></div>
                <span className="bg-white dark:bg-stone-900 px-3 text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase">
                  ou avec votre email
                </span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                  Nom complet / Pseudonyme *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Aminata Traoré"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-stone-800"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                Adresse e-mail *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@exemple.bf"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-stone-800"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                    Mot de passe *
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setSuccessMessage(null);
                        setMode('forgot');
                      }}
                      className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-stone-800"
                  />
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                  Confirmer le mot de passe *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmez votre mot de passe"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-stone-800"
                  />
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div className="p-3 bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-xl text-[11px] text-stone-600 dark:text-stone-400 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Règles d’attribution des comptes</span>
                </div>
                <p>
                  Toute nouvelle inscription est initialisée en statut <strong>Lecteur Citoyen (USER)</strong>. Pour devenir Journaliste professionnel ou Rédaction accréditée, vous pourrez soumettre votre demande d’accréditation avec justificatif de carte de presse dans votre profil.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>
                {loading
                  ? 'Traitement en cours...'
                  : mode === 'login'
                  ? 'Se connecter'
                  : mode === 'register'
                  ? 'Créer mon compte citoyen'
                  : 'Envoyer le lien de récupération'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Mode Switch Footers */}
          <div className="text-center pt-1 border-t border-stone-100 dark:border-stone-800">
            {mode === 'login' && (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Vous n'avez pas encore de compte ?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMessage(null);
                    setMode('register');
                  }}
                  className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Créer un compte
                </button>
              </p>
            )}

            {mode === 'register' && (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Vous avez déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMessage(null);
                    setMode('login');
                  }}
                  className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Se connecter
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setMode('login');
                }}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3 h-3" />
                <span>Retour à la connexion</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
