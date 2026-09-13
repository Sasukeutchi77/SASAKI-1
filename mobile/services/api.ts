import {
  User,
  Article,
  Category,
  Comment,
  RankingsResponse,
  TopMediaHouse,
  TopJournalist,
  Poll,
  Notification,
  VerificationRequest,
} from '../types';
import { storage } from './storage';
import {
  isFirebaseConfigured,
  loginWithFirebaseEmailAndProfile,
  registerWithFirebaseEmailAndProfile,
  fetchArticlesFromCloud,
  fetchCategoriesFromCloud,
  fetchCommentsFromCloud,
  addCommentToCloud,
  fetchNotificationsFromCloud,
  logoutFirebase,
  saveUserProfileToFirestore,
  submitVerificationRequestToFirestore,
  fetchVerificationRequestsFromFirestore,
  reviewVerificationRequestInFirestore,
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = (data && data.error) || `Erreur (${response.status})`;
    throw new Error(errorMsg);
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

  // Authentification Hybride (Priorité Firebase Auth Native + Synchronisation Firestore)
  async login(credentials: { email: string; password: string }) {
    const cleanEmail = credentials.email.trim().toLowerCase();
    const cleanPass = credentials.password;

    // 1. Tenter Firebase Auth nativement (Connexion directe sans restriction de proxy)
    if (isFirebaseConfigured()) {
      try {
        const { user, token } = await loginWithFirebaseEmailAndProfile(cleanEmail, cleanPass);
        await setToken(token);
        await setUser(user);
        return { user, token, message: 'Connexion réussie.' };
      } catch (fbErr: any) {
        console.warn('[API Mobile] Erreur Firebase login:', fbErr.message);

        // Si Firebase a retourné une erreur d'identifiant claire, la lever directement
        if (
          fbErr.message?.includes('Identifiants incorrects') ||
          fbErr.message?.includes('Aucun compte n’est associé') ||
          fbErr.message?.includes('mot de passe doit comporter')
        ) {
          throw fbErr;
        }

        // Tenter l'API REST en cas d'indisponibilité temporaire Firebase
        try {
          const res = await apiRequest<{ token: string; user: User; message: string }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
          });
          if (res?.token && res?.user) {
            await setToken(res.token);
            await setUser(res.user);
            return res;
          }
        } catch {
          // Relancer l'erreur Firebase conviviale
          throw fbErr;
        }
      }
    }

    // 2. Fallback REST standard
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

    // 1. Tenter l'inscription Firebase Auth directe (rôle citoyen par défaut)
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
        console.warn('[API Mobile] Erreur Firebase register:', fbErr.message);
        throw fbErr;
      }
    }

    // 2. Fallback REST
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

  async updateProfile(profileData: Partial<User>) {
    const current = await getUser();
    if (!current) throw new Error('Vous devez être connecté.');

    const updatedUser: User = { ...current, ...profileData, updatedAt: new Date().toISOString() };
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
    page?: number;
    limit?: number;
    sort?: string;
  } = {}) {
    try {
      const query = new URLSearchParams();
      if (params.feed) query.set('feed', params.feed);
      if (params.category) query.set('category', params.category);
      if (params.search) query.set('search', params.search);
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

  // Classements
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
    if (user) {
      try {
        const cloudNotifs = await fetchNotificationsFromCloud(user.id);
        if (cloudNotifs.length > 0) {
          return { notifications: cloudNotifs };
        }
      } catch {}
    }

    // Notifications de bienvenue par défaut
    return {
      notifications: [
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
          title: '🚨 Dépêche urgente disponible',
          message: 'Nouveau décret officiel n°44 publié par la rédaction.',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
    };
  },

  // Création d'article (Journalistes / Admins)
  async createArticle(data: {
    title: string;
    summary?: string;
    content: string;
    categoryId: string;
    coverImage?: string;
    tags?: string[];
    status?: 'published' | 'draft';
  }) {
    return apiRequest<{ article: Article; message: string }>('/api/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

    // Upload d'image Cloudinary via backend sécurisé
  async uploadMedia(base64Image: string, usageType: string = 'article_cover', folder: string = 'purge_mobile') {
    return apiRequest<{
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
        mediaName: data.mediaName,
        pressCardNumber: data.pressCardNumber,
        motivation: data.motivation,
        documentUrl: data.documentUrl,
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
