/**
 * CONFIGURATION DES COMPTES PRINCIPAUX (SUPER ADMINISTRATEURS)
 * 
 * Règle stricte de PURGE-INFO :
 * 1. Seuls ces 2 comptes principaux détiennent le contrôle TOTAL de la plateforme.
 * 2. Tous les autres comptes créés (inscription manuelle ou Google) sont d'abord de simples utilisateurs ('user').
 * 3. Seuls ces 2 comptes principaux ont le pouvoir d'accréditer/promouvoir un compte simple en 'journaliste'.
 * 4. Les comptes journalistes créent ou rejoignent une « Maison de Journalistes » (max 5 journalistes par maison)
 *    pour pouvoir publier leurs journaux et articles.
 */

export const MASTER_ADMIN_EMAILS: string[] = [
  'astaimperial45t@gmail.com',  // Compte Principal 1 (Super Administrateur Principal)
  'direction.purge@gmail.com', // Compte Principal 2 (Second compte Super Administrateur)
];

/**
 * Vérifie si une adresse e-mail correspond à l'un des deux comptes principaux
 */
export function isMasterAdmin(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return MASTER_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === clean);
}

/**
 * Récupère la liste des deux comptes principaux configurés
 */
export function getMasterAdminEmails(): string[] {
  return [...MASTER_ADMIN_EMAILS];
}
