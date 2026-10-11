/**
 * Formats and normalizes authentication errors into friendly, meaningful messages.
 * Handles API errors (both English and French), Firebase error codes, network failures,
 * and rate-limiting responses.
 */

export interface AnalyzedAuthError {
  title: string;
  message: string;
  category:
    | 'credentials'
    | 'user_not_found'
    | 'already_exists'
    | 'session_expired'
    | 'suspended'
    | 'weak_password'
    | 'invalid_email'
    | 'rate_limit'
    | 'network'
    | 'popup'
    | 'unauthorized_domain'
    | 'operation_not_allowed'
    | 'unknown';
  actionType?: 'register' | 'forgot' | 'login' | 'retry' | 'support';
  actionLabel?: string;
  actionTip?: string;
}

export function analyzeAuthError(error: any): AnalyzedAuthError {
  if (!error) {
    return {
      title: 'Erreur d’authentification',
      message: 'Une erreur inattendue est survenue. Veuillez réessayer.',
      category: 'unknown',
    };
  }

  const rawMsg: string =
    typeof error === 'string'
      ? error
      : typeof error?.message === 'string' && error.message.trim()
      ? error.message.trim()
      : typeof error?.error === 'string' && error.error.trim()
      ? error.error.trim()
      : typeof error?.error?.message === 'string' && error.error.message.trim()
      ? error.error.message.trim()
      : typeof error?.details === 'string' && error.details.trim()
      ? error.details.trim()
      : String(error);

  const lower = rawMsg.toLowerCase().trim();
  const status = error?.status;

  // 1. Session expired / Unauthenticated request
  if (
    status === 401 ||
    lower.includes('non authentifié') ||
    lower.includes('authentification requise') ||
    lower.includes('token invalide') ||
    lower.includes('token expiré') ||
    lower.includes('session expirée') ||
    lower.includes('session invalid') ||
    lower.includes('auth/id-token-expired') ||
    lower.includes('auth/user-token-expired')
  ) {
    return {
      title: 'Session Expirée',
      message: 'Votre session de connexion a expiré. Veuillez vous reconnecter pour poursuivre.',
      category: 'session_expired',
      actionType: 'login',
      actionLabel: 'Se reconnecter',
      actionTip: 'Cliquez pour ouvrir la fenêtre de connexion.',
    };
  }

  // 2. Invalid credentials / Wrong password
  if (
    lower.includes('invalid credentials') ||
    lower.includes('invalid credential') ||
    lower.includes('invalid-credential') ||
    lower.includes('invalid-login-credentials') ||
    lower.includes('wrong-password') ||
    lower.includes('wrong password') ||
    lower.includes('mot de passe incorrect') ||
    lower.includes('identifiants invalides') ||
    lower.includes('bad credentials')
  ) {
    return {
      title: 'Mot de passe incorrect',
      message: 'L’adresse email ou le mot de passe saisi est incorrect. Vérifiez vos identifiants.',
      category: 'credentials',
      actionType: 'forgot',
      actionLabel: 'Mot de passe oublié ?',
      actionTip: 'Cliquez pour recevoir un lien de réinitialisation sécurisé.',
    };
  }

  // 3. User not found / Account does not exist
  if (
    lower.includes('user not found') ||
    lower.includes('user-not-found') ||
    lower.includes('no user') ||
    lower.includes('aucun compte') ||
    lower.includes('utilisateur introuvable') ||
    lower.includes('compte non trouvé')
  ) {
    return {
      title: 'Compte introuvable',
      message: 'Aucun compte n’est associé à cette adresse email. Rejoignez la communauté en créant votre profil.',
      category: 'user_not_found',
      actionType: 'register',
      actionLabel: 'Créer un compte',
      actionTip: 'Inscription rapide et gratuite en quelques secondes.',
    };
  }

  // 4. Email already exists / already in use
  if (
    lower.includes('email already exists') ||
    lower.includes('email-already-in-use') ||
    lower.includes('email already in use') ||
    lower.includes('already registered') ||
    lower.includes('existe déjà') ||
    lower.includes('adresse email déjà')
  ) {
    return {
      title: 'Compte déjà existant',
      message: 'Un compte avec cette adresse email existe déjà sur la plateforme PURGE-INFO.',
      category: 'already_exists',
      actionType: 'login',
      actionLabel: 'Se connecter',
      actionTip: 'Connectez-vous directement ou réinitialisez votre mot de passe.',
    };
  }

  // 5. Account suspended / disabled
  if (
    status === 403 ||
    lower.includes('user-disabled') ||
    lower.includes('account suspended') ||
    lower.includes('suspendu') ||
    lower.includes('désactivé') ||
    lower.includes('banni')
  ) {
    return {
      title: 'Compte suspendu',
      message: 'Ce compte utilisateur a été suspendu par l’équipe de modération de PURGE-INFO.',
      category: 'suspended',
      actionType: 'support',
      actionLabel: 'Aide & Modération',
      actionTip: 'Contactez la rédaction pour toute demande de réexamen.',
    };
  }

  // 6. Rate limiting / Too many requests
  if (
    status === 429 ||
    lower.includes('too-many-requests') ||
    lower.includes('too many requests') ||
    lower.includes('trop de tentatives') ||
    lower.includes('action trop rapide') ||
    lower.includes('rate limit')
  ) {
    return {
      title: 'Trop de tentatives',
      message: rawMsg.includes('seconde') || rawMsg.includes('minute')
        ? rawMsg
        : 'Trop de tentatives infructueuses ont été détectées. Veuillez patienter un instant avant de réessayer.',
      category: 'rate_limit',
      actionType: 'retry',
      actionLabel: 'Patienter',
    };
  }

  // 7. Google popup closed / blocked
  if (lower.includes('popup-blocked') || lower.includes('bloqué') || lower.includes('popup_blocked')) {
    return {
      title: 'Fenêtre Google bloquée',
      message: 'Le navigateur a bloqué l’ouverture de la fenêtre d’authentification Google.',
      category: 'popup',
      actionType: 'retry',
      actionLabel: 'Autoriser & Réessayer',
      actionTip: 'Autorisez les fenêtres surgissantes (popups) dans la barre d’adresse de votre navigateur.',
    };
  }

  if (lower.includes('popup-closed-by-user') || lower.includes('popup fermée')) {
    return {
      title: 'Connexion interrompue',
      message: 'La fenêtre d’authentification a été fermée avant la validation.',
      category: 'popup',
      actionType: 'retry',
      actionLabel: 'Relancer Google',
    };
  }

  // 8. Firebase configuration issues
  if (lower.includes('unauthorized-domain') || (lower.includes('domaine') && lower.includes('autorisé'))) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'ce domaine';
    return {
      title: 'Domaine non autorisé',
      message: `Le domaine "${host}" doit être ajouté aux domaines autorisés de votre projet Firebase Console.`,
      category: 'unauthorized_domain',
      actionType: 'support',
      actionLabel: 'Paramètres Firebase',
    };
  }

  if (lower.includes('operation-not-allowed') || lower.includes('non activée')) {
    return {
      title: 'Méthode d’accès désactivée',
      message: 'Cette méthode de connexion doit être activée dans votre Firebase Console (Sign-in providers).',
      category: 'operation_not_allowed',
      actionType: 'support',
      actionLabel: 'Sign-in method',
    };
  }

  // 9. Weak password
  if (
    lower.includes('weak-password') ||
    lower.includes('weak password') ||
    lower.includes('trop court') ||
    lower.includes('au moins 6 caractères') ||
    lower.includes('mot de passe doit contenir')
  ) {
    return {
      title: 'Mot de passe insuffisant',
      message: 'Le mot de passe doit comporter au moins 6 caractères pour des raisons de sécurité.',
      category: 'weak_password',
    };
  }

  // 10. Invalid email
  if (
    lower.includes('invalid-email') ||
    lower.includes('invalid email') ||
    lower.includes('email invalide') ||
    lower.includes('adresse email valide')
  ) {
    return {
      title: 'Adresse email invalide',
      message: 'Veuillez saisir une adresse email correcte et complète (ex: citoyen@purge.info).',
      category: 'invalid_email',
    };
  }

  // 11. Network error
  if (
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('connexion impossible') ||
    lower.includes('joindre le serveur') ||
    error?.networkError
  ) {
    return {
      title: 'Connexion impossible',
      message: 'Impossible de joindre le serveur. Vérifiez votre accès internet et réessayez.',
      category: 'network',
      actionType: 'retry',
      actionLabel: 'Réessayer',
    };
  }

  // Default fallback
  const cleanMsg = rawMsg.replace(/^Error:\s*/i, '').trim();
  return {
    title: 'Erreur d’authentification',
    message:
      cleanMsg && !cleanMsg.startsWith('[object') && cleanMsg.length > 5
        ? cleanMsg
        : 'Une erreur est survenue lors de l’authentification. Veuillez vérifier vos informations et réessayer.',
    category: 'unknown',
    actionType: 'retry',
    actionLabel: 'Réessayer',
  };
}

export function formatAuthErrorMessage(error: any): string {
  return analyzeAuthError(error).message;
}

