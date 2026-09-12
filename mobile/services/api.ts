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
} from '../types';
import { storage } from './storage';

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
}

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
    console.error(`[API Network Error] ${url}:`, netErr);
    throw new Error('Connexion au serveur PURGE impossible. Vérifiez votre réseau.');
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

  // Authentification
  async login(credentials: { email: string; password: string }) {
    const data = await apiRequest<{ token: string; user: User; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (data.token) {
      await setToken(data.token);
    }
    if (data.user) {
      await setUser(data.user);
    }
    return data;
  },

  async register(formData: { name: string; email: string; password: string; accountType?: string }) {
    const data = await apiRequest<{ token: string; user: User; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    if (data.token) {
      await setToken(data.token);
    }
    if (data.user) {
      await setUser(data.user);
    }
    return data;
  },

  async getMe() {
    const res = await apiRequest<{ user: User; unreadNotifs: number; bookmarksCount: number }>('/api/auth/me');
    if (res && res.user) {
      await setUser(res.user);
    }
    return res;
  },

  async updateProfile(profileData: Partial<User>) {
    const res = await apiRequest<{ user: User; message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    if (res && res.user) {
      await setUser(res.user);
    }
    return res;
  },

  // Catégories
  async getCategories() {
    return apiRequest<{ categories: Category[] }>('/api/categories');
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
    const query = new URLSearchParams();
    if (params.feed) query.set('feed', params.feed);
    if (params.category) query.set('category', params.category);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.sort) query.set('sort', params.sort);

    return apiRequest<{
      articles: Article[];
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    }>(`/api/articles?${query.toString()}`);
  },

  async getArticle(id: string) {
    return apiRequest<{ article: Article }>(`/api/articles/${id}`);
  },

  async recordView(id: string) {
    return apiRequest<{ viewsCount: number }>(`/api/articles/${id}/view`, {
      method: 'POST',
    });
  },

  async toggleLikeArticle(id: string) {
    return apiRequest<{ liked: boolean; likesCount: number }>(`/api/articles/${id}/like`, {
      method: 'POST',
    });
  },

  async toggleBookmarkArticle(id: string) {
    return apiRequest<{ bookmarked: boolean }>(`/api/articles/${id}/bookmark`, {
      method: 'POST',
    });
  },

  async votePoll(articleId: string, optionId: string) {
    return apiRequest<{ poll: Poll; message: string }>(`/api/articles/${articleId}/poll/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    });
  },

  async getComments(articleId: string) {
    return apiRequest<{ comments: Comment[]; total: number }>(`/api/articles/${articleId}/comments`);
  },

  async addComment(articleId: string, content: string, parentId?: string) {
    return apiRequest<{ comment: Comment; message: string }>(`/api/articles/${articleId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId }),
    });
  },

  // Recherche globale
  async searchGlobal(query: string, category?: string) {
    const params = new URLSearchParams({ q: query, limit: '20' });
    if (category) params.set('category', category);
    return apiRequest<{
      articles: { items: Article[]; total: number };
      journalists: { items: User[]; total: number };
      categories: { items: Category[]; total: number };
    }>(`/api/search?${params.toString()}`);
  },

  // Classements & Maisons
  async getTopRankings(): Promise<RankingsResponse> {
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
  },

  // Favoris & Notifications
  async getBookmarks() {
    return apiRequest<{ bookmarks: Article[] }>('/api/users/me/bookmarks');
  },

  async getNotifications() {
    return apiRequest<{ notifications: Notification[] }>('/api/users/me/notifications');
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
};
