# Audit de Sécurité et Spécification de Durcissement — FasoInfo (PROMPT 8)

## 1. Synthèse de l'Audit de Sécurité

Cet audit a analysé l'intégralité de la plateforme FasoInfo : Firebase Authentication, règles Firestore, contrôle d'accès basé sur les rôles (RBAC), intégration Cloudinary, API REST Express, validation des entrées utilisateur, mécanismes anti-spam, gestion des sessions et prévention des élévations de privilèges.

---

### A. Failles Critiques (Niveau Élevé)

1. **Absence de vérification du statut "suspendu" sur les opérations d'écriture :**
   - *Constat :* Bien que la connexion directe soit bloquée pour les comptes au statut `suspended`, un utilisateur possédant déjà un jeton JWT ou Firebase ID token actif pouvait continuer à publier des articles, poster des commentaires, liker, signaler ou téléverser des médias.
   - *Impact :* Un utilisateur banni ou suspendu par l'administration pouvait continuer à nuire sur la plateforme.
   - *Correction :* Middleware `requireActiveUser` sur l'ensemble des routes mutatives (POST, PUT, DELETE) et vérification dans Firestore rules `isAccountActive(userId)`.

2. **Élévation de privilèges potentielle via les mises à jour de profil :**
   - *Constat :* Dans les règles Firestore initiales, bien que le champ `role` soit verrouillé, le champ `verificationStatus` n'était pas expressément interdit de modification par l'utilisateur propriétaire du document `users/{userId}`. De plus, aucune liste blanche stricte des clés modifiables n'était appliquée.
   - *Impact :* Possibilité pour un attaquant d'injecter `verificationStatus: 'approved'` ou des champs personnalisés non prévus (`isAdmin: true`).
   - *Correction :* Application d'une liste blanche stricte de champs modifiables (`name`, `bio`, `avatar`, `coverImage`, `phone`, `lastLoginAt`) et verrouillage absolu des champs de gouvernance (`role`, `isVerified`, `verificationStatus`, `status`, `createdAt`).

3. **Absence totale de Rate Limiting & vulnérabilité aux attaques par force brute :**
   - *Constat :* Aucun mécanisme de limitation de débit n'était en place sur les routes d'authentification (`/api/auth/login`, `/api/auth/register`), de publication de commentaires (`/api/articles/:id/comments`), ou d'envoi de médias (`/api/media/upload`).
   - *Impact :* Possibilité d'attaques par dictionnaire sur les mots de passe, création massive de faux comptes par des scripts, ou déni de service / saturation de la base de données.
   - *Correction :* Implémentation d'un gestionnaire de limitation de fréquence avec fenêtres glissantes (sliding window) par IP et identifiant utilisateur, avec ralentissement exponentiel sur les échecs d'authentification.

---

### B. Failles Moyennes

4. **Spam et inondation (Flood) de commentaires & doublons :**
   - *Constat :* Un utilisateur pouvait envoyer 50 commentaires identiques en quelques secondes sur le même article sans délai d'attente (cooldown) ni détection de doublons.
   - *Impact :* Dégradation de l'espace de discussion, pollution visuelle, harcèlement d'auteurs.
   - *Correction :* Délai minimal de 5 secondes entre deux commentaires d'un même utilisateur, limite de 8 commentaires par tranche de 2 minutes, et rejet des commentaires identiques consécutifs sous 10 minutes.

5. **Assainissement insuffisant des entrées (Risques XSS & Injection) :**
   - *Constat :* Les textes soumis (titres, résumés, commentaires, biographies, URLs de médias) n'étaient que simplement nettoyés avec `.trim()`, sans filtrage des balises HTML, scripts ou protocoles malveillants (`javascript:` dans les liens).
   - *Impact :* Risque de stockage de vecteurs XSS et d'injection de scripts si des rendus HTML tiers sont utilisés ou en cas d'export.
   - *Correction :* Module d'assainissement systématique `sanitizer.ts` (encodage HTML, filtrage strict des protocoles d'URL `https://` / `http://`, validation regex d'email et identifiants, limitation des répétitions de caractères).

6. **Absence d'en-têtes HTTP de sécurité (Security Headers) :**
   - *Constat :* Le serveur Express ne définissait pas les en-têtes recommandés (`X-Content-Type-Options`, `Referrer-Policy`, etc.).
   - *Impact :* Vulnérabilité au sniffing de type MIME et fuites d'informations sur le référent.
   - *Correction :* Middleware d'en-têtes de sécurité configuré pour la plateforme (compatible avec l'iframe d'aperçu d'AI Studio).

7. **Sécurité Cloudinary & Quotas de téléversement :**
   - *Constat :* Les signatures Cloudinary devaient être plus strictement encadrées pour interdire la génération de signatures pour des dossiers sensibles par des utilisateurs non autorisés.
   - *Correction :* Vérification des types MIME réels, validation de la taille maximale (10 Mo pour images, 60 Mo pour vidéos), et interdiction aux simples lecteurs de générer des signatures pour les dossiers d'articles.

8. **Règles Firestore permissives sur les notifications :**
   - *Constat :* `match /notifications/{id}` autorisait `allow create: if isAuthenticated();` sans vérifier la légitimité du destinataire ni le contenu.
   - *Impact :* Risque d'envoi de fausses notifications ou de phishing inter-utilisateurs.
   - *Correction :* Restriction des créations de notifications au serveur backend ou validation stricte des types de notifications autorisés.

---

### C. Améliorations Recommandées

- **Journalisation de sécurité (Audit Logs) :** Enregistrement de toutes les tentatives suspectes (échecs de connexion répétés, tentatives de contournement de rôle).
- **Gestion gracieuse des erreurs :** Aucune fuite de stack trace ou de détails internes du serveur dans les réponses d'erreur retournées au client.
- **Retour visuel convivial :** Affichage d'un message clair et rassurant à l'utilisateur lorsqu'une limite de débit ou une restriction de sécurité est rencontrée.

---

## 2. Matrice des Invariants de Données (Security Invariants)

| Entité | Champs Immuables (Client) | Rôles Autorisés | Règles de Validation |
| :--- | :--- | :--- | :--- |
| **User** | `role`, `isVerified`, `verificationStatus`, `status`, `createdAt` | USER (auto), ADMIN (gestion rôles) | Nom 2-60 car., Email valide, Bio max 500 car. |
| **Article** | `authorId`, `viewsCount`, `likesCount`, `commentsCount`, `createdAt` | JOURNALIST, ADMIN | Titre 5-200 car., Contenu >= 50 car., Catégorie existante |
| **Comment** | `userId`, `articleId`, `likesCount`, `createdAt` | USER actif, JOURNALIST, ADMIN | Texte 2-1200 car., Cooldown 5s, Pas de doublon |
| **Report** | `reporterId`, `targetType`, `targetId`, `status` (initial 'pending') | Tout utilisateur actif | Motif obligatoire, 1 seul signalement actif par cible |
| **MediaRecord** | `ownerId`, `publicId`, `resourceType` | Propriétaire ou ADMIN | Formats autorisés (JPG, PNG, WEBP, MP4), Quotas stricts |
| **AdminLog** | Tous (Strictement Immuable) | ADMIN uniquement | Aucune mise à jour ni suppression possible |

---

## 3. Matrice de Test — Les 12 Scénarios d'Attaque (Dirty Dozen)

1. **Attaque 1 (Privilege Escalation - Register) :** Un client envoie `{ role: "admin", accountType: "admin" }` lors de `/api/auth/register` ou à la création Firestore.
   *Résultat attendu :* Le compte est créé avec le rôle forcé `reader` (ou `user`). Rejet de toute valeur privilégiée.
2. **Attaque 2 (Privilege Escalation - Profile Update) :** Un utilisateur appelle `PUT /api/auth/profile` ou `updateDoc` avec `{ role: "admin", isVerified: true, status: "active" }`.
   *Résultat attendu :* Les champs sensibles sont ignorés ou l'opération est refusée. Le rôle reste inchangé.
3. **Attaque 3 (Suspended Account Action) :** Un utilisateur marqué `status: "suspended"` tente d'ajouter un commentaire, un like ou un article.
   *Résultat attendu :* Rejet avec code HTTP `403 Interdit` et message explicatif.
4. **Attaque 4 (Brute-Force Login) :** 15 tentatives de connexion erronées rapides sur le même email / IP.
   *Résultat attendu :* Blocage temporaire (HTTP 429 Too Many Requests) avec délai de déblocage.
5. **Attaque 5 (Comment Flooding) :** Envoi de 10 commentaires consécutifs en moins de 3 secondes.
   *Résultat attendu :* Première requête acceptée, suivantes bloquées avec HTTP 429 ("Veuillez patienter 5 secondes entre chaque commentaire").
6. **Attaque 6 (Duplicate Spam Comment) :** Envoi du même texte de commentaire répété sur un article.
   *Résultat attendu :* Détecté comme spam en double et refusé.
7. **Attaque 7 (Stored XSS Injection) :** Soumission d'un commentaire avec `<script>alert(1)</script><img src=x onerror=stealCookies()>` ou d'une URL `javascript:void(0)`.
   *Résultat attendu :* Balises nettoyées et échappées, URL dangereuse rejetée.
8. **Attaque 8 (Article Impersonation) :** Un utilisateur soumet un article avec `authorId: "usr_admin_123"`.
   *Résultat attendu :* L'identifiant de l'auteur est strictement extrait du jeton d'authentification vérifié (`req.user.id`), l'usurpation échoue.
9. **Attaque 9 (Unauthorized Media Signature) :** Un simple utilisateur demande une signature Cloudinary pour le dossier `fasoinfo/articles`.
   *Résultat attendu :* Rejet avec HTTP 403 (seuls journalistes et admins peuvent uploader des médias d'articles).
10. **Attaque 10 (Media Quota Oversize) :** Tentative de téléversement d'une image dépassant 10 Mo ou vidéo dépassant 60 Mo.
    *Résultat attendu :* Rejet immédiat avec message clair.
11. **Attaque 11 (Duplicate Report Abuse) :** Un utilisateur soumet à répétition 10 signalements sur le même article ou commentaire.
    *Résultat attendu :* Rejet après le premier signalement en cours.
12. **Attaque 12 (Admin Audit Log Tampering) :** Tentative de modification ou de suppression d'une entrée dans `adminLogs`.
    *Résultat attendu :* Refus catégorique (`allow update, delete: if false;`).
