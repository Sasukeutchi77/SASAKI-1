/**
 * Formats and normalizes authentication errors into friendly, meaningful messages.
 * Handles API errors (both English and French), Firebase error codes, network failures,
 * and rate-limiting responses.
 */

export function formatAuthErrorMessage(error: any): string {
  if (!error) {
    return 'Une erreur inattendue est survenue lors de l’authentification.';
  }

  // Extract raw error string from Error object, response object, or string
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

  // 1. Invalid credentials / Wrong password
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
    return 'Identifiants invalides : l’adresse email ou le mot de passe est incorrect. Veuillez vérifier votre saisie.';
  }

  // 2. Email already exists / already in use
  if (
    lower.includes('email already exists') ||
    lower.includes('email-already-in-use') ||
    lower.includes('email already in use') ||
    lower.includes('already registered') ||
    lower.includes('existe déjà') ||
    lower.includes('adresse email déjà')
  ) {
    return 'Un compte avec cette adresse email existe déjà. Veuillez vous connecter avec votre mot de passe ou le réinitialiser.';
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
    return 'Aucun compte n’est associé à cette adresse email. Veuillez vérifier l’orthographe ou créer un compte citoyen.';
  }

  // 4. Account suspended / disabled
  if (
    lower.includes('user-disabled') ||
    lower.includes('account suspended') ||
    lower.includes('suspendu') ||
    lower.includes('désactivé') ||
    lower.includes('banni')
  ) {
    return 'Votre compte a été suspendu par l’équipe de modération de PURGE-INFO. Veuillez contacter le support.';
  }

  // 5. Password too weak / short
  if (
    lower.includes('weak-password') ||
    lower.includes('weak password') ||
    lower.includes('trop court') ||
    lower.includes('au moins 6 caractères') ||
    lower.includes('password must be') ||
    lower.includes('mot de passe doit contenir')
  ) {
    return 'Le mot de passe doit comporter au moins 6 caractères.';
  }

  // 6. Invalid email format
  if (
    lower.includes('invalid-email') ||
    lower.includes('invalid email') ||
    lower.includes('email invalide') ||
    lower.includes('adresse email valide requise') ||
    lower.includes('format d’adresse email invalide')
  ) {
    return 'Le format de l’adresse email est invalide. Veuillez renseigner une adresse email correcte (ex: contact@exemple.bf).';
  }

  // 7. Rate limiting / Too many requests
  if (
    lower.includes('too-many-requests') ||
    lower.includes('too many requests') ||
    lower.includes('trop de tentatives') ||
    lower.includes('action trop rapide') ||
    lower.includes('rate limit') ||
    error?.status === 429
  ) {
    if (rawMsg.includes('seconde') || rawMsg.includes('minute')) {
      return rawMsg;
    }
    return 'Trop de tentatives infructueuses. Veuillez patienter quelques instants avant de réessayer.';
  }

  // 8. Network / Connection errors
  if (
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('network-request-failed') ||
    lower.includes('connexion impossible') ||
    lower.includes('joindre le serveur') ||
    error?.networkError
  ) {
    return 'Impossible de joindre le serveur PURGE-INFO. Veuillez vérifier votre connexion internet et réessayer.';
  }

  // 9. Google popup closed / blocked
  if (lower.includes('popup-closed-by-user') || lower.includes('popup fermée')) {
    return 'La fenêtre de connexion Google a été fermée avant la validation.';
  }
  if (lower.includes('popup-blocked') || lower.includes('bloqué')) {
    return 'Le navigateur a bloqué l’ouverture de la fenêtre Google. Veuillez autoriser les popups pour ce site.';
  }

  // If already clean and descriptive, return original text
  if (
    rawMsg &&
    !rawMsg.startsWith('Error:') &&
    !rawMsg.startsWith('[object') &&
    rawMsg.length > 5
  ) {
    return rawMsg;
  }

  return 'Une erreur est survenue lors de l’authentification. Veuillez vérifier vos informations et réessayer.';
}
