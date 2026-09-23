import {
  User,
  Article,
  Category,
  Comment,
  RankingsResponse,
  MediaHouse,
  TopMediaHouse,
  TopJournalist,
  Poll,
  Notification,
  VerificationRequest,
} from '../types';
import { storage } from './storage';
import {
  isFirebaseConfigured,
  isMasterAdmin,
  loginWithFirebaseEmailAndProfile,
  registerWithFirebaseEmailAndProfile,
  fetchArticlesFromCloud,
  fetchCategoriesFromCloud,
  fetchCommentsFromCloud,
  addCommentToCloud,
  fetchNotificationsFromCloud,
  deleteNotificationFromCloud,
  deleteUserNotificationsFromCloud,
  logoutFirebase,
  saveUserProfileToFirestore,
  saveArticleToCloud,
  saveMediaHouseToCloud,
  fetchMediaHousesFromCloud,
  submitVerificationRequestToFirestore,
  fetchVerificationRequestsFromFirestore,
  reviewVerificationRequestInFirestore,
  resetUserPasswordInFirestore,
} from './firebase';

const TOKEN_KEY = 'purge_mobile_token';
const USER_KEY = 'purge_mobile_user';

// Définition de l'URL de base API - Priorité à la variable d'environnement Expo
const DEFAULT_FALLBACK_URL = 'https://ais-dev-zhsd7l5y3xfrth647bh6oi-155891801467.europe-west2.run.app';

export function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return DEFAULT_FALLBACK_URL;
}

export async function getToken(): Promise<string | null> {
  return await storage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await storage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await storage.removeItem(TOKEN_KEY);
}

export async function getUser(): Promise<User | null> {
  const raw = await storage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function setUser(user: User | null): Promise<void> {
  if (user) {
    await storage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    await storage.removeItem(USER_KEY);
  }
}

export async function clearSession(): Promise<void> {
  await clearToken();
  await setUser(null);
  await logoutFirebase().catch(() => {});
}

// Les 6 catégories officielles PURGE garanties
export const OFFICIAL_CATEGORIES: Category[] = [
  { id: 'cat_purgeur', name: 'PURGEUR', slug: 'purgeur', description: 'Actualités, faits d’armes et chroniques des Purgeurs', order: 1 },
  { id: 'cat_clans', name: 'CLANS', slug: 'clans', description: 'Alliances, territoires et opérations des clans', order: 2 },
  { id: 'cat_familles', name: 'FAMILLES', slug: 'familles', description: 'Lignées historiques et actualités des familles', order: 3 },
  { id: 'cat_purge', name: 'PURGE', slug: 'purge', description: 'Déroulement, décrets officiels et alertes de la Purge', order: 4 },
  { id: 'cat_competition', name: 'COMPÉTITION', slug: 'competition', description: 'Tournois, arènes et classements', order: 5 },
  { id: 'cat_celebrites', name: 'CÉLÉBRITÉS', slug: 'celebrites', description: 'Figures publiques, icônes et personnalités', order: 6 },
];

// Articles factuels de référence pour garantir qu'un nouveau téléphone affiche immédiatement un flux riche
export const CURATED_FALLBACK_ARTICLES: Article[] = [
  {
    id: 'art_purgeur_elite_2026',
    title: 'Révélations sur l’entraînement secret des Purgeurs d’Élite',
    slug: 'revelations-entrainement-secret-purgeurs-elite',
    summary: 'Enquête exclusive sur les protocoles militaires et les doctrines tactiques adoptées par les commandos de purgeurs avant l’ouverture de la saison.',
    content: 'Une investigation minutieuse au cœur des bases d’entraînement révèle les nouveaux équipements balistiques et les tactiques de combat rapproché. Les purges de nouvelle génération s’annoncent plus méthodiques que jamais, encadrées par des décrets stricts mais impitoyables.\n\nSelon nos sources internes, trois unités distinctes ont complété les épreuves de qualification avec un taux de réussite sans précédent. Les observateurs indépendants saluent la rigueur factuelle des protocoles, tout en alertant sur l’élévation du niveau de dangerosité dans les périmètres urbains.',
    coverImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=900&auto=format&fit=crop&q=80',
    categoryId: 'cat_purgeur',
    categoryName: 'PURGEUR',
    categorySlug: 'purgeur',
    authorId: 'usr_admin_naruto',
    authorName: 'Naruto Uzumaki',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    authorRole: 'admin',
    authorIsVerified: true,
    mediaName: 'PURGE OFFICIAL',
    status: 'published',
    viewsCount: 1420,
    likesCount: 238,
    commentsCount: 34,
    tags: ['#purgeur', '#tactique', '#direct', '#enquete'],
    readTime: 4,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'art_clans_sombre_pacte',
    title: 'Le Sommet des Sept Clans : Pacte de Non-Agression Fragilisé',
    slug: 'sommet-sept-clans-pacte-non-agression',
    summary: 'Les délibérations nocturnes entre les chefs de faction n’ont pas permis d’apaiser les tensions territoriales à l’approche de la Purge.',
    content: 'Les délégations des grands clans se sont réunies à huis clos dans le secteur neutre. Les négociations ont buté sur le partage des couloirs de ravitaillement et l’attribution des zones d’arbitrage.\n\nAlors que les émissaires du Clan du Nord réclamaient une révision des décrets frontaliers, les représentants de la plaine ont opposé un refus catégorique. Les observateurs craignent une reprise des hostilités dès le signal d’ouverture.',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900&auto=format&fit=crop&q=80',
    categoryId: 'cat_clans',
    categoryName: 'CLANS',
    categorySlug: 'clans',
    authorId: 'usr_admin_itachi',
    authorName: 'Itachi Uchiha',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    authorRole: 'admin',
    authorIsVerified: true,
    mediaName: 'L’Écho des Factions',
    status: 'published',
    viewsCount: 980,
    likesCount: 174,
    commentsCount: 19,
    tags: ['#clans', '#pacte', '#diplomatie', '#alerte'],
    readTime: 5,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'art_competition_arene_finale',
    title: 'Arène Centrale : Le Duel des Maîtres d’Armes Confirmé',
    slug: 'arene-centrale-duel-maitres-armes-confirme',
    summary: 'La commission des tournois a validé le tirage au sort des quarts de finale. Les affrontements débuteront sous haute surveillance arbitrale.',
    content: 'C’est l’affiche la plus attendue de l’année. Les deux champions invaincus se retrouveront face à face dans l’enceinte principale. Les billets de loge se sont arrachés en moins de quatre minutes.\n\nLes règles de sécurité ont été renforcées avec déploiement de capteurs biométriques et arbitrage vidéo haute définition. L’enjeu : le titre suprême et le bouclier d’immunité pour la saison à venir.',
    coverImage: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=900&auto=format&fit=crop&q=80',
    categoryId: 'cat_competition',
    categoryName: 'COMPÉTITION',
    categorySlug: 'competition',
    authorId: 'usr_admin_minato',
    authorName: 'Minato Namikaze',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    authorRole: 'admin',
    authorIsVerified: true,
    mediaName: 'PURGE CHRONICLES',
    status: 'published',
    viewsCount: 2150,
    likesCount: 412,
    commentsCount: 56,
    tags: ['#competition', '#arene', '#duels', '#champions'],
    readTime: 3,
    createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
  },
  {
    id: 'art_purge_decret_securite',
    title: 'Décret Officiel n°44 : Règles Sanctuaires et Zones Protégées',
    slug: 'decret-officiel-44-regles-sanctuaires-zones-protegees',
    summary: 'Publication intégrale du décret d’application régissant les périmètres hospitaliers et les refuges civils lors des 24 heures de Purge.',
    content: 'Le conseil supérieur de régulation a promulgué le décret d’urgence n°44. Tout manquement aux périmètres sacrés des zones neutres entraînera une disqualification immédiate et des sanctions irrévocables.\n\nLes citoyens non combattants sont invités à rejoindre les abris homologués dès le retentissement de la première sirène d’alerte.',
    coverImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=900&auto=format&fit=crop&q=80',
    categoryId: 'cat_purge',
    categoryName: 'PURGE',
    categorySlug: 'purge',
    authorId: 'usr_admin_naruto',
    authorName: 'Naruto Uzumaki',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    authorRole: 'admin',
    authorIsVerified: true,
    mediaName: 'PURGE OFFICIAL',
    status: 'published',
    viewsCount: 3100,
    likesCount: 620,
    commentsCount: 88,
    tags: ['#decret', '#purge', '#securite', '#officiel'],
    readTime: 6,
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: 'art_familles_dynasties_pouvoir',
    title: 'Les Grandes Dynasties Face aux Réformes Territoriales',
    slug: 'grandes-dynasties-reformes-territoriales',
    summary: 'Analyse approfondie des accords patrimoniaux et des arbitrages d’héritage conclus entre les trois lignées historiques de la cité.',
    content: 'Les représentants des trois familles fondatrices ont ratifié les avenants du protocole de partage civil. Cet accord historique définit les périmètres résidentiels et la protection des biens ancestraux durant toute la saison.\n\nLes archives patrimoniales confirment la régularité des actes et le strict respect des quotas d’arbitrage définis par la charte centrale.',
    coverImage: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=900&auto=format&fit=crop&q=80',
    categoryId: 'cat_familles',
    categoryName: 'FAMILLES',
    categorySlug: 'familles',
    authorId: 'usr_admin_sasuke',
    authorName: 'Sasuke Uchiha',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    authorRole: 'admin',
    authorIsVerified: true,
    mediaName: 'L’Écho des Factions',
    status: 'published',
    viewsCount: 1680,
    likesCount: 310,
    commentsCount: 42,
    tags: ['#familles', '#dynastie', '#patrimoine', '#enquete'],
    readTime: 5,
    createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
  },
  {
    id: 'art_celebrites_interview_exclusive',
    title: 'Figure Publique : L’Entretien Exclusif avec la Nouvelle Prodige',
    slug: 'figure-publique-entretien-exclusif-nouvelle-prodige',
    summary: 'Révélation de la saison, elle revient sur sa préparation tactique, sa notoriété grandissante et ses ambitions dans l’arène centrale.',
    content: 'À seulement vingt-deux ans, elle captive les regards des observateurs et bouscule la hiérarchie établie des maîtres d’armes. Dans cet entretien exclusif accordé à notre rédaction, elle dévoile les coulisses de sa rigueur quotidienne et son refus catégorique des compromis d’influence.\n\nUne prise de parole authentique saluée unanimement par la communauté citoyenne.',
    coverImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&auto=format&fit=crop&q=80',
    categoryId: 'cat_celebrites',
    categoryName: 'CÉLÉBRITÉS',
    categorySlug: 'celebrites',
    authorId: 'usr_admin_kakashi',
    authorName: 'Kakashi Hatake',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    authorRole: 'admin',
    authorIsVerified: true,
    mediaName: 'PURGE CHRONICLES',
    status: 'published',
    viewsCount: 2890,
    likesCount: 540,
    commentsCount: 75,
    tags: ['#celebrites', '#portrait', '#investigation', '#interview'],
    readTime: 4,
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr) {
    throw new Error('Connexion au serveur PURGE impossible. Vérifiez votre réseau mobile.');
  }

  // Vérification stricte anti-redirection HTML proxy Cloud Run
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html') || response.url.includes('cookie_check')) {
    throw new Error('PROXY_HTML_REDIRECT');
  }

  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => '');
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }
  }

  if (!response.ok) {
    const errorMsg =
      (typeof data === 'string' && data.trim()) ||
      (typeof data?.error === 'string' && data.error.trim()) ||
      (typeof data?.error?.message === 'string' && data.error.message.trim()) ||
      (typeof data?.message === 'string' && data.message.trim()) ||
      (Array.isArray(data?.errors) && (data.errors[0]?.message || data.errors[0])) ||
      (typeof data?.details === 'string' && data.details.trim()) ||
      `Erreur (${response.status})`;
    throw new Error(String(errorMsg));
  }

  return data as T;
}

export const api = {
  getApiBaseUrl,
  getToken,
  setToken,
  clearToken,
  getUser,
  setUser,
  clearSession,
  request: apiRequest,

  // Authentification Directe Cloud Firestore & Hybride Firebase
  async login(credentials: { email: string; password: string }) {
    const cleanEmail = credentials.email.trim().toLowerCase();
    const cleanPass = credentials.password;

    // 1. Authentification directe Cloud Firestore / Firebase (Connexion directe sans restriction de proxy)
    if (isFirebaseConfigured()) {
      try {
        const { user, token } = await loginWithFirebaseEmailAndProfile(cleanEmail, cleanPass);
        await setToken(token);
        await setUser(user);
        return { user, token, message: 'Connexion réussie.' };
      } catch (fbErr: any) {
        console.warn('[API Mobile] Erreur connexion:', fbErr.message);
        throw fbErr;
      }
    }

    // 2. Fallback REST si Firebase n'est pas configuré
    const res = await apiRequest<{ token: string; user: User; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
    });
    if (res?.token && res?.user) {
      await setToken(res.token);
      await setUser(res.user);
      return res;
    }
    throw new Error('Identifiants invalides ou service indisponible.');
  },

  async register(formData: { name: string; email: string; password: string }) {
    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPass = formData.password;

    // 1. Inscription directe Cloud Firestore / Firebase (rôle citoyen par défaut)
    if (isFirebaseConfigured()) {
      try {
        const { user, token } = await registerWithFirebaseEmailAndProfile({
          name: cleanName,
          email: cleanEmail,
          pass: cleanPass,
        });
        await setToken(token);
        await setUser(user);
        return { user, token, message: 'Compte citoyen créé avec succès.' };
      } catch (fbErr: any) {
        console.warn('[API Mobile] Erreur inscription:', fbErr.message);
        throw fbErr;
      }
    }

    // 2. Fallback REST si Firebase n'est pas configuré
    const res = await apiRequest<{ token: string; user: User; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: cleanName,
        email: cleanEmail,
        password: cleanPass,
        accountType: 'citoyen',
      }),
    });
    if (res?.token && res?.user) {
      await setToken(res.token);
      await setUser(res.user);
      return res;
    }
    throw new Error('Échec de l’inscription. Veuillez réessayer.');
  },

  async resetPassword(email: string, newPass: string) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = newPass.trim();

    if (isFirebaseConfigured()) {
      await resetUserPasswordInFirestore(cleanEmail, cleanPass);
      return { message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' };
    }

    const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, newPassword: cleanPass }),
    });
    return res;
  },

  async getMe() {
    try {
      const res = await apiRequest<{ user: User; unreadNotifs: number; bookmarksCount: number }>('/api/auth/me');
      if (res && res.user) {
        await setUser(res.user);
        return res;
      }
    } catch {
      // Ignorer si REST offline, utiliser l'utilisateur stocké
    }
    const cachedUser = await getUser();
    return {
      user: cachedUser as User,
      unreadNotifs: 0,
      bookmarksCount: 0,
    };
  },

  async getProfile(): Promise<{ user: User }> {
    const me = await this.getMe();
    return { user: me.user };
  },

  async updateProfile(profileData: Partial<User>) {
    const current = await getUser();
    if (!current) throw new Error('Vous devez être connecté.');

    const isAdmin = isMasterAdmin(current.email);
    const updatedUser: User = {
      ...current,
      ...profileData,
      role: isAdmin ? 'admin' : current.role,
      accountType: isAdmin ? ('admin' as any) : current.accountType,
      isVerified: isAdmin ? true : current.isVerified,
      updatedAt: new Date().toISOString(),
    };
    await setUser(updatedUser);
    await saveUserProfileToFirestore(updatedUser);

    try {
      await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
    } catch {
      // Toléré si hors-ligne
    }
    return { user: updatedUser, message: 'Profil mis à jour.' };
  },

  // Catégories
  async getCategories(): Promise<{ categories: Category[] }> {
    try {
      const res = await apiRequest<{ categories: Category[] }>('/api/categories');
      if (res?.categories && res.categories.length > 0) {
        return res;
      }
    } catch {
      // Essayer Firestore direct
    }

    try {
      const cloudCats = await fetchCategoriesFromCloud();
      if (cloudCats.length > 0) {
        return { categories: cloudCats };
      }
    } catch {}

    return { categories: OFFICIAL_CATEGORIES };
  },

  // Articles & Fil d'actualité
  async getArticles(params: {
    feed?: 'foryou' | 'following' | 'latest' | 'trending';
    category?: string;
    search?: string;
    mediaHouseId?: string;
    page?: number;
    limit?: number;
    sort?: string;
  } = {}) {
    try {
      const query = new URLSearchParams();
      if (params.feed) query.set('feed', params.feed);
      if (params.category) query.set('category', params.category);
      if (params.search) query.set('search', params.search);
      if (params.mediaHouseId) query.set('mediaHouseId', params.mediaHouseId);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.sort) query.set('sort', params.sort);

      const res = await apiRequest<{
        articles: Article[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
      }>(`/api/articles?${query.toString()}`);

      if (res?.articles && res.articles.length > 0) {
        return res;
      }
    } catch (apiErr) {
      console.log('[API Mobile] REST articles indisponible, bascule Firestore direct...');
    }

    // 2. Bascule transparente vers Cloud Firestore
    try {
      const cloudArticles = await fetchArticlesFromCloud({
        categoryId: params.category,
        limitCount: params.limit || 25,
      });

      if (cloudArticles.length > 0) {
        let filtered = [...cloudArticles];
        if (params.mediaHouseId) {
          filtered = filtered.filter((a) => (a as any).mediaHouseId === params.mediaHouseId || (a as any).mediaId === params.mediaHouseId);
        }
        if (params.search) {
          const s = params.search.toLowerCase();
          filtered = filtered.filter(
            (a) => a.title.toLowerCase().includes(s) || a.summary.toLowerCase().includes(s)
          );
        }
        return {
          articles: filtered,
          total: filtered.length,
          page: 1,
          limit: 25,
          hasMore: false,
        };
      }
    } catch (fsErr) {
      console.warn('[API Mobile] Erreur Firestore articles:', fsErr);
    }

    // 3. Fallback d'actualités de référence pour ne jamais laisser le flux vide
    let fallback = [...CURATED_FALLBACK_ARTICLES];
    if (params.category) {
      fallback = fallback.filter((a) => a.categoryId === params.category);
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      fallback = fallback.filter(
        (a) => a.title.toLowerCase().includes(s) || a.summary.toLowerCase().includes(s)
      );
    }

    return {
      articles: fallback,
      total: fallback.length,
      page: 1,
      limit: 25,
      hasMore: false,
    };
  },

  async getArticle(id: string) {
    try {
      const res = await apiRequest<{ article: Article }>(`/api/articles/${id}`);
      if (res?.article) return res;
    } catch {}

    // Chercher dans le cache ou articles de référence
    const found = CURATED_FALLBACK_ARTICLES.find((a) => a.id === id);
    if (found) return { article: found };

    const all = await fetchArticlesFromCloud();
    const match = all.find((a) => a.id === id);
    if (match) return { article: match };

    throw new Error('Article introuvable.');
  },

  async recordView(id: string) {
    try {
      return await apiRequest<{ viewsCount: number }>(`/api/articles/${id}/view`, {
        method: 'POST',
      });
    } catch {
      return { viewsCount: 1 };
    }
  },

  async toggleLikeArticle(id: string) {
    try {
      return await apiRequest<{ liked: boolean; likesCount: number }>(`/api/articles/${id}/like`, {
        method: 'POST',
      });
    } catch {
      return { liked: true, likesCount: 1 };
    }
  },

  async toggleBookmarkArticle(id: string) {
    try {
      return await apiRequest<{ bookmarked: boolean }>(`/api/articles/${id}/bookmark`, {
        method: 'POST',
      });
    } catch {
      return { bookmarked: true };
    }
  },

  async votePoll(articleId: string, optionId: string) {
    try {
      return await apiRequest<{ poll: Poll; message: string }>(`/api/articles/${articleId}/poll/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionId }),
      });
    } catch {
      return {
        poll: {
          id: 'poll_today',
          question: 'Quel clan prendra l’avantage lors des prochaines arènes ?',
          options: [
            { id: 'opt_1', text: 'Le Clan du Nord', votesCount: 142 },
            { id: 'opt_2', text: 'Les Ombres Urbaines', votesCount: 98 },
            { id: 'opt_3', text: 'L’Ordre Écarlate', votesCount: 76 },
          ],
          totalVotes: 316,
          userVotedOptionId: optionId,
        },
        message: 'Votre vote citoyen a été comptabilisé.',
      };
    }
  },

  async getComments(articleId: string) {
    try {
      const res = await apiRequest<{ comments: Comment[]; total: number }>(`/api/articles/${articleId}/comments`);
      if (res?.comments) return res;
    } catch {}

    const cloudComments = await fetchCommentsFromCloud(articleId);
    return { comments: cloudComments, total: cloudComments.length };
  },

  async addComment(articleId: string, content: string, parentId?: string) {
    const user = await getUser();
    if (!user) throw new Error('Vous devez être connecté pour publier un commentaire.');

    try {
      const res = await apiRequest<{ comment: Comment; message: string }>(`/api/articles/${articleId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parentId }),
      });
      if (res?.comment) return res;
    } catch {}

    const newCmt = await addCommentToCloud(articleId, content, user);
    if (newCmt) {
      return { comment: newCmt, message: 'Commentaire publié avec succès.' };
    }
    throw new Error('Impossible d’enregistrer votre commentaire.');
  },

  // Recherche globale
  async searchGlobal(queryStr: string, category?: string) {
    try {
      const params = new URLSearchParams({ q: queryStr, limit: '20' });
      if (category) params.set('category', category);
      const res = await apiRequest<{
        articles: { items: Article[]; total: number };
        journalists: { items: User[]; total: number };
        categories: { items: Category[]; total: number };
      }>(`/api/search?${params.toString()}`);
      if (res?.articles?.items) return res;
    } catch {}

    const allArticles = await this.getArticles({ search: queryStr, category });
    return {
      articles: { items: allArticles.articles, total: allArticles.total },
      journalists: { items: [], total: 0 },
      categories: { items: OFFICIAL_CATEGORIES, total: OFFICIAL_CATEGORIES.length },
    };
  },

  // Classements & Maisons de Presse
  async getMediaHouses(): Promise<{ mediaHouses: MediaHouse[] }> {
    try {
      const res = await apiRequest<{ mediaHouses: MediaHouse[] }>('/api/media-houses');
      if (res?.mediaHouses && res.mediaHouses.length > 0) return res;
    } catch (err) {
      // Fallback Cloud Firestore
    }

    try {
      const cloudHouses = await fetchMediaHousesFromCloud();
      if (cloudHouses.length > 0) {
        return { mediaHouses: cloudHouses };
      }
    } catch (err) {
      console.warn('[API] Erreur chargement maisons Cloud:', err);
    }

    // Références éditoriales PURGE par défaut
    return {
      mediaHouses: [
        {
          id: 'house_purge_investigation',
          name: 'PURGE INVESTIGATION',
          slug: 'purge-investigation',
          logo: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
          coverImage: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
          description: 'Cellule d’investigation d’élite de PURGE. Traque des dossiers sensibles et révélations exclusives.',
          motto: 'La vérité crue, sans filtre ni complaisance.',
          specialties: ['Investigation', 'Sécurité & Défense', 'Politique'],
          ownerId: 'usr_admin_naruto',
          ownerName: 'Naruto Uzumaki',
          followersCount: 1420,
          articlesCount: 18,
          isVerified: true,
          trustScore: 98,
          createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        },
        {
          id: 'house_sphinx_afrique',
          name: 'LE SPHINX INDÉPENDANT',
          slug: 'le-sphinx-independant',
          logo: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150&auto=format&fit=crop&q=80',
          coverImage: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1000&auto=format&fit=crop&q=80',
          description: 'Journalisme citoyen et analyses géopolitiques en direct.',
          motto: 'L’œil vigilant de la société civile.',
          specialties: ['Société & Citoyenneté', 'Économie & Finance'],
          ownerId: 'usr_journaliste_itachi',
          ownerName: 'Itachi Uchiha',
          followersCount: 890,
          articlesCount: 12,
          isVerified: true,
          trustScore: 94,
          createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
        },
      ],
    };
  },

  async getMediaHouseById(id: string): Promise<{ house: MediaHouse; articles: Article[] }> {
    try {
      return await apiRequest<{ house: MediaHouse; articles: Article[] }>(`/api/media-houses/${id}`);
    } catch {
      const housesRes = await this.getMediaHouses();
      const house = housesRes.mediaHouses.find((h) => h.id === id || h.slug === id);
      const articlesRes = await this.getArticles({ limit: 10 });
      return {
        house: house || housesRes.mediaHouses[0],
        articles: articlesRes.articles.filter((a) => a.mediaName === house?.name) || [],
      };
    }
  },

  async toggleFollowMediaHouse(houseId: string): Promise<{ isFollowing: boolean; followersCount: number }> {
    try {
      const res = await apiRequest<{ isFollowing: boolean; followersCount: number }>(
        `/api/media-houses/${houseId}/follow`,
        { method: 'POST' }
      );
      if (res) return res;
    } catch {}
    return { isFollowing: true, followersCount: 1 };
  },

  async followMediaHouse(houseId: string): Promise<{ isFollowing: boolean; followersCount: number }> {
    return this.toggleFollowMediaHouse(houseId);
  },

  async followUser(userId: string): Promise<{ isFollowing: boolean; followersCount: number }> {
    try {
      const res = await apiRequest<{ isFollowing: boolean; followersCount: number }>(
        `/api/users/${userId}/follow`,
        { method: 'POST' }
      );
      if (res) return res;
    } catch {}
    return { isFollowing: true, followersCount: 1 };
  },

  async createMediaHouse(data: Partial<MediaHouse>): Promise<{ message: string; house: MediaHouse }> {
    const user = await getUser();
    const now = new Date().toISOString();
    const cleanName = (data.name || 'Maison de Presse').trim();
    const cleanSlug = cleanName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const newHouse: MediaHouse = {
      id: `house_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      slug: cleanSlug,
      logo: data.logo || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
      coverImage: data.coverImage || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
      description: data.description || `Maison de presse indépendante fondée par ${user?.name || 'Citoyen'}.`,
      motto: data.motto || "L'information vérifiée, sans concession.",
      specialties: data.specialties || ['Investigation', 'Société'],
      ownerId: user?.id || 'usr_unknown',
      ownerName: user?.name || 'Fondateur',
      members: user?.id ? [user.id] : [],
      followersCount: 1,
      articlesCount: 0,
      isVerified: true,
      trustScore: 85,
      phone: data.phone,
      email: data.email || user?.email,
      website: data.website,
      address: data.address || 'Bureau Éditorial Central',
      createdAt: now,
      updatedAt: now,
    };

    // 1. Sauvegarde directe dans Cloud Firestore
    await saveMediaHouseToCloud(newHouse).catch(() => {});

    // Mettre à jour la session locale et promouvoir en Chef de Rédaction
    if (user) {
      const updatedUser: User = {
        ...user,
        mediaId: newHouse.id,
        mediaName: newHouse.name,
        mediaHouseRole: 'Chef de Rédaction',
        role: user.role === 'admin' ? 'admin' : 'journalist',
        accountType: user.role === 'admin' ? ('admin' as any) : 'journalist',
        isVerified: true,
      };
      await setUser(updatedUser);
      await saveUserProfileToFirestore(updatedUser).catch(() => {});
    }

    // 2. Notification au serveur REST
    try {
      const res = await apiRequest<{ message: string; house: MediaHouse }>('/api/media-houses', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res?.house) return res;
    } catch (err) {
      console.warn('[API] createMediaHouse fallback cloud direct:', err);
    }

    return { message: 'Maison de presse fondée avec succès !', house: newHouse };
  },

  async getTopRankings(): Promise<RankingsResponse> {
    try {
      const [housesRes, journalistsRes] = await Promise.all([
        apiRequest<{ topHouses: TopMediaHouse[]; total: number; lastUpdated: string }>('/api/media-houses/top-7'),
        apiRequest<{ topJournalists: TopJournalist[]; total: number; lastUpdated: string }>('/api/users/top-7-journalists'),
      ]);

      return {
        topHouses: housesRes.topHouses || [],
        topJournalists: journalistsRes.topJournalists || [],
        totalHousesCount: housesRes.total || 0,
        totalJournalistsCount: journalistsRes.total || 0,
        lastUpdated: housesRes.lastUpdated || new Date().toISOString(),
      };
    } catch {
      return {
        topHouses: [
          { id: 'mh_1', name: 'PURGE OFFICIAL', slug: 'purge-official', logo: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=120', trustScore: 98, articlesCount: 142, journalistsCount: 12, followersCount: 1240, rating: 4.9, rank: 1 },
          { id: 'mh_2', name: 'L’Écho des Factions', slug: 'echo-factions', logo: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=120', trustScore: 94, articlesCount: 88, journalistsCount: 8, followersCount: 850, rating: 4.7, rank: 2 },
          { id: 'mh_3', name: 'PURGE CHRONICLES', slug: 'purge-chronicles', logo: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=120', trustScore: 92, articlesCount: 65, journalistsCount: 6, followersCount: 610, rating: 4.6, rank: 3 },
        ],
        topJournalists: [
          { id: 'usr_admin_naruto', name: 'Naruto Uzumaki', username: 'naruto_admin', role: 'admin', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', isVerified: true, articlesCount: 45, followersCount: 890, trustScore: 97 },
          { id: 'usr_admin_itachi', name: 'Itachi Uchiha', username: 'itachi_investigation', role: 'admin', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', isVerified: true, articlesCount: 38, followersCount: 720, trustScore: 96 },
        ],
        totalHousesCount: 3,
        totalJournalistsCount: 2,
        lastUpdated: new Date().toISOString(),
      };
    }
  },

  // Favoris & Notifications
  async getBookmarks(): Promise<{ bookmarks: Article[] }> {
    try {
      const res = await apiRequest<{ bookmarks: Article[] }>('/api/users/me/bookmarks');
      if (res?.bookmarks) return res;
    } catch {}
    return { bookmarks: [] };
  },

  async getNotifications(): Promise<{ notifications: Notification[] }> {
    const user = await getUser();
    let deletedIds: string[] = [];
    try {
      const stored = await storage.getItem('purge_deleted_notif_ids');
      if (stored) {
        deletedIds = JSON.parse(stored);
      }
    } catch {}

    let notifs: Notification[] = [];
    if (user) {
      try {
        const cloudNotifs = await fetchNotificationsFromCloud(user.id);
        if (cloudNotifs.length > 0) {
          notifs = cloudNotifs;
        }
      } catch {}
    }

    if (notifs.length === 0) {
      // Notifications de bienvenue par défaut
      notifs = [
        {
          id: 'notif_welcome',
          userId: user?.id || 'guest',
          type: 'system',
          title: 'Bienvenue sur PURGE',
          message: 'Votre application de journalisme factuel et d’investigation est active.',
          read: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'notif_flash',
          userId: user?.id || 'guest',
          type: 'breaking_news',
          title: '[Dépêche urgente] Flash info disponible',
          message: 'Nouveau décret officiel n°44 publié par la rédaction.',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    // Filtrer les notifications supprimées par l'utilisateur
    if (deletedIds.length > 0) {
      notifs = notifs.filter((n) => !deletedIds.includes(n.id));
    }

    return { notifications: notifs };
  },

  async deleteNotification(id: string): Promise<boolean> {
    try {
      // 1. Sauvegarder dans les IDs supprimés localement
      const stored = await storage.getItem('purge_deleted_notif_ids');
      const deletedIds: string[] = stored ? JSON.parse(stored) : [];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        await storage.setItem('purge_deleted_notif_ids', JSON.stringify(deletedIds));
      }

      // 2. Supprimer de Cloud Firestore si document existant
      deleteNotificationFromCloud(id).catch(() => {});

      // 3. Supprimer de l'API backend si disponible
      apiRequest(`/api/users/me/notifications/${id}`, { method: 'DELETE' }).catch(() => {});

      return true;
    } catch (err) {
      console.warn('[API Mobile] Erreur deleteNotification:', err);
      return false;
    }
  },

  async clearAllNotifications(ids?: string[]): Promise<boolean> {
    try {
      const stored = await storage.getItem('purge_deleted_notif_ids');
      const deletedIds: string[] = stored ? JSON.parse(stored) : [];
      if (ids && ids.length > 0) {
        ids.forEach((id) => {
          if (!deletedIds.includes(id)) deletedIds.push(id);
        });
      }
      await storage.setItem('purge_deleted_notif_ids', JSON.stringify(deletedIds));

      const user = await getUser();
      if (user) {
        deleteUserNotificationsFromCloud(user.id).catch(() => {});
      }
      if (ids) {
        ids.forEach((id) => deleteNotificationFromCloud(id).catch(() => {}));
      }

      apiRequest('/api/users/me/notifications', { method: 'DELETE' }).catch(() => {});
      return true;
    } catch (err) {
      console.warn('[API Mobile] Erreur clearAllNotifications:', err);
      return false;
    }
  },

  async markNotificationRead(id: string): Promise<boolean> {
    try {
      await apiRequest(`/api/users/me/notifications/${id}/read`, { method: 'PUT' });
      return true;
    } catch {
      return false;
    }
  },

  async markAllNotificationsRead(): Promise<boolean> {
    try {
      await apiRequest('/api/users/me/notifications/read-all', { method: 'PUT' });
      return true;
    } catch {
      return false;
    }
  },

  // Création d'article (Journalistes / Admins)
  async createArticle(data: {
    title: string;
    summary?: string;
    content: string;
    categoryId: string;
    coverImage?: string;
    videoUrl?: string;
    videoThumbnail?: string;
    poll?: Poll;
    tags?: string[];
    status?: 'published' | 'draft';
    mediaHouseId?: string;
    mediaHouseName?: string;
  }): Promise<{ article: Article; message: string }> {
    const user = await getUser();
    const now = new Date().toISOString();
    const articleId = `art_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const categoriesRes = await this.getCategories().catch(() => ({ categories: OFFICIAL_CATEGORIES }));
    const cat = categoriesRes.categories.find((c) => c.id === data.categoryId);

    const targetMediaId = data.mediaHouseId || user?.mediaId;
    const targetMediaName = data.mediaHouseName || user?.mediaName || 'PURGE INDÉPENDANT';

    const newArticle: Article = {
      id: articleId,
      title: data.title,
      slug: data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'article',
      summary: data.summary || (data.content ? data.content.slice(0, 160) + '...' : ''),
      content: data.content,
      coverImage: data.coverImage || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=900&auto=format&fit=crop&q=80',
      videoUrl: data.videoUrl,
      videoThumbnail: data.videoThumbnail,
      poll: data.poll,
      categoryId: data.categoryId,
      categoryName: cat?.name || 'PURGE',
      categorySlug: cat?.slug || 'purge',
      authorId: user?.id || 'usr_anonymous',
      authorName: user?.name || 'Journaliste Anonyme',
      authorAvatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      authorRole: user?.role || 'journalist',
      authorIsVerified: user?.isVerified ?? true,
      mediaId: targetMediaId,
      mediaName: targetMediaName,
      status: data.status || 'published',
      viewsCount: 1,
      likesCount: 0,
      commentsCount: 0,
      tags: data.tags || ['#purge', '#investigation'],
      readTime: Math.max(1, Math.ceil(data.content.split(/\s+/).length / 200)),
      createdAt: now,
      updatedAt: now,
    };

    // 1. Sauvegarde directe dans Cloud Firestore
    await saveArticleToCloud(newArticle).catch(() => {});

    // 2. Notification serveur REST si en ligne
    try {
      const res = await apiRequest<{ article: Article; message: string }>('/api/articles', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          mediaId: targetMediaId,
          mediaName: targetMediaName,
        }),
      });
      if (res?.article) return res;
    } catch (err) {
      console.warn('[API] createArticle fallback cloud direct:', err);
    }

    return { article: newArticle, message: 'Article publié avec succès !' };
  },

  // Upload d'image Cloudinary via backend sécurisé avec repli local instantané
  async uploadMedia(base64Image: string, usageType: string = 'article_cover', folder: string = 'purge_mobile') {
    try {
      const res = await apiRequest<{
        success: boolean;
        media: { url: string; publicId: string };
        warning?: string;
      }>('/api/media/upload', {
        method: 'POST',
        body: JSON.stringify({
          file: base64Image,
          type: 'image',
          usageType,
          folder,
        }),
      });
      if (res?.success && res.media?.url) return res;
    } catch (err) {
      console.warn('[API Mobile] uploadMedia REST indisponible, repli local direct:', err);
    }

    return {
      success: true,
      media: {
        url: base64Image,
        publicId: `upload_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      },
    };
  },

  // Demande d'accréditation Journaliste (Workflow Citoyen -> Journaliste)
  async requestVerification(data: {
    mediaName?: string;
    pressCardNumber: string;
    motivation: string;
    documentUrl?: string;
  }) {
    const user = await getUser();
    if (!user) throw new Error('Vous devez être connecté.');

    // 1. Tenter l'envoi REST
    try {
      const res = await apiRequest<{ message: string; request: VerificationRequest }>(
        '/api/users/me/request-verification',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      if (res?.message) {
        // Mettre à jour l'utilisateur en local
        const updatedUser: User = { ...user, verificationStatus: 'pending' };
        await setUser(updatedUser);
        return res;
      }
    } catch (restErr: any) {
      console.log('[API Mobile] REST request-verification indisponible, bascule Firestore direct:', restErr.message);
    }

    // 2. Fallback direct Firestore
    if (isFirebaseConfigured()) {
      const createdReq = await submitVerificationRequestToFirestore({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        mediaName: data.mediaName || user.mediaName || 'Média Indépendant',
        pressCardNumber: data.pressCardNumber || 'Candidat Citoyen / Enquêteur',
        motivation: data.motivation,
        documentUrl: data.documentUrl ? data.documentUrl.trim() : '',
      });
      const updatedUser: User = { ...user, verificationStatus: 'pending' };
      await setUser(updatedUser);
      return {
        message: 'Votre demande d’accréditation a bien été transmise aux administrateurs de PURGE.',
        request: createdReq,
      };
    }

    throw new Error('Impossible d’envoyer la demande. Veuillez vérifier votre connexion.');
  },

  // Récupération des demandes d'accréditation (Espace Administrateur)
  async getVerificationRequests(status?: string): Promise<{ requests: VerificationRequest[] }> {
    // 1. Essayer REST admin
    try {
      const query = status && status !== 'all' ? `?status=${status}` : '';
      const res = await apiRequest<{ requests: VerificationRequest[] }>(`/api/admin/verification-requests${query}`);
      if (res?.requests) return res;
    } catch {}

    // 2. Fallback Firestore direct
    try {
      const cloudReqs = await fetchVerificationRequestsFromFirestore(status);
      return { requests: cloudReqs };
    } catch {
      return { requests: [] };
    }
  },

  // Décision administrative sur une demande (Approuver / Rejeter)
  async reviewVerificationRequest(
    requestId: string,
    status: 'approved' | 'rejected',
    adminNotes?: string
  ) {
    // 1. Essayer REST admin
    try {
      const res = await apiRequest<{ message: string; user?: User }>(
        `/api/admin/verification-requests/${requestId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ status, adminNotes }),
        }
      );
      if (res?.message) return res;
    } catch (err: any) {
      console.log('[API Mobile] REST review-verification indisponible, bascule Firestore:', err.message);
    }

    // 2. Fallback Firestore direct
    await reviewVerificationRequestInFirestore(requestId, status, adminNotes);
    return {
      message: status === 'approved' ? 'Accréditation validée avec succès.' : 'Demande rejetée.',
    };
  },
};
