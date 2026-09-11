import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, initialMode = 'login' }) => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword, isFirebaseActive } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#040817] border border-blue-500/30 rounded-2xl shadow-[0_0_50px_rgba(29,104,255,0.25)] overflow-hidden flex flex-col my-4 max-h-[92vh] transition-all text-slate-100">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0b142c] to-[#040817] border-b border-blue-500/20 px-6 py-4 flex items-center justify-between shrink-0 transition-all">
          <div>
            <h2 className="text-lg font-black text-white">
              {mode === 'login' && 'Connexion à PURGE-INFO'}
              {mode === 'register' && 'Créer un compte citoyen'}
              {mode === 'forgot' && 'Réinitialiser votre mot de passe'}
            </h2>
            <p className="text-xs text-blue-300/60 font-mono">
              {mode === 'login' && 'Accédez à vos lectures, favoris et débats'}
              {mode === 'register' && 'Rejoignez le réseau d’information vérifiée'}
              {mode === 'forgot' && 'Recevez les instructions par courrier électronique'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-blue-300/60 hover:text-cyan-200 hover:bg-blue-600/20 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 text-red-200 text-xs rounded-xl flex flex-col gap-2 font-medium">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span className="leading-relaxed">{error}</span>
              </div>
              {mode === 'login' && error.toLowerCase().includes('aucun compte') && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('register');
                  }}
                  className="self-start mt-1 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(0,210,255,0.2)]"
                >
                  <span>Créer mon compte citoyen maintenant</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-blue-950/60 border border-blue-500/40 text-cyan-300 text-xs rounded-xl flex items-start gap-2 font-medium shadow-[0_0_12px_rgba(0,210,255,0.15)]">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
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
                className="w-full py-2.5 px-4 bg-[#081026] hover:bg-[#0e1936] text-slate-200 border border-blue-500/30 hover:border-cyan-400 rounded-xl text-xs font-bold font-mono transition-all shadow-[0_2px_10px_rgba(0,10,35,0.4)] flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
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
                <div className="border-t border-blue-500/20 w-full"></div>
                <span className="bg-[#040817] px-3 text-[10px] font-bold font-mono text-blue-300/50 uppercase tracking-widest">
                  ou avec votre email
                </span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider mb-1">
                  Nom complet / Pseudonyme *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-400/60" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Clara Dupont"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#081026] border border-blue-500/35 text-slate-100 placeholder:text-blue-300/30 rounded-lg focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,210,255,0.3)]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider mb-1">
                Adresse e-mail *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-400/60" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@exemple.bf"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#081026] border border-blue-500/35 text-slate-100 placeholder:text-blue-300/30 rounded-lg focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,210,255,0.3)]"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider">
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
                      className="text-[11px] font-bold font-mono text-cyan-400 hover:text-cyan-200 hover:underline cursor-pointer"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-400/60" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-[#081026] border border-blue-500/35 text-slate-100 placeholder:text-blue-300/30 rounded-lg focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,210,255,0.3)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400/60 hover:text-cyan-300 p-1 cursor-pointer transition-colors"
                    title={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider mb-1">
                  Confirmer le mot de passe *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-400/60" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmez votre mot de passe"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-[#081026] border border-blue-500/35 text-slate-100 placeholder:text-blue-300/30 rounded-lg focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,210,255,0.3)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400/60 hover:text-cyan-300 p-1 cursor-pointer transition-colors"
                    title={showConfirmPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div className="p-3 bg-[#081026] border border-blue-500/30 rounded-xl text-[11px] text-blue-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold font-mono text-cyan-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
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
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white rounded-xl text-xs font-black font-mono shadow-[0_0_15px_rgba(29,104,255,0.4)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </form>

          {/* Mode Switch Footers */}
          <div className="text-center pt-1 border-t border-blue-500/20">
            {mode === 'login' && (
              <p className="text-xs text-blue-300/60 font-mono">
                Vous n'avez pas encore de compte ?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMessage(null);
                    setMode('register');
                  }}
                  className="font-bold text-cyan-300 hover:text-cyan-100 hover:underline cursor-pointer"
                >
                  Créer un compte
                </button>
              </p>
            )}

            {mode === 'register' && (
              <p className="text-xs text-blue-300/60 font-mono">
                Vous avez déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMessage(null);
                    setMode('login');
                  }}
                  className="font-bold text-cyan-300 hover:text-cyan-100 hover:underline cursor-pointer"
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
                className="text-xs font-bold font-mono text-cyan-300 hover:text-cyan-100 hover:underline inline-flex items-center gap-1 cursor-pointer"
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
