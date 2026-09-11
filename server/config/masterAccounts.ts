/**
 * CONFIGURATION DES COMPTES PRINCIPAUX (SUPER ADMINISTRATEURS)
 * 
 * Règle stricte de PURGE-INFO :
 * 1. Seuls ces 4 comptes administrateurs détiennent le contrôle TOTAL de la plateforme :
 *    - naruto455t@gmail.com
 *    - itachi45t@gmail.com
 *    - nami45tt@gmail.com
 *    - minato45tt@gmail.com
 * 2. À part ces 4 adresses, aucun autre compte ne peut être administrateur.
 * 3. Tous les autres comptes créés (inscription manuelle ou Google) sont des comptes citoyens ('user').
 * 4. Seuls ces 4 comptes administrateurs ont le pouvoir d'accréditer/promouvoir un compte simple en 'journaliste'.
 * 5. Les journalistes accrédités créent ou rejoignent une « Maison de Journalistes » (max 5 journalistes par maison)
 *    pour pouvoir publier leurs journaux et articles.
 */

export const MASTER_ADMIN_EMAILS: string[] = [
  'naruto455t@gmail.com',
  'itachi45t@gmail.com',
  'nami45tt@gmail.com',
  'minato45tt@gmail.com',
];

/**
 * Mot de passe / code de connexion officiel universel pour tous les comptes administrateurs principaux
 */
export const MASTER_ADMIN_DEFAULT_PASSWORD = 'Madara45';

/**
 * Vérifie si une adresse e-mail correspond à l'un des comptes administrateurs officiels
 */
export function isMasterAdmin(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return MASTER_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === clean);
}

/**
 * Récupère la liste des comptes administrateurs officiels configurés
 */
export function getMasterAdminEmails(): string[] {
  return [...MASTER_ADMIN_EMAILS];
}

