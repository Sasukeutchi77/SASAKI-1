import {
  User,
  UserRole,
  Article,
  Category,
  Comment,
  Notification,
  PlatformStats,
  VerificationRequest,
  Report,
  MediaHouse,
  AdminLog,
  MediaRecord,
  TopMediaHouse,
  TopJournalist,
  RankingsResponse,
  Poll,
} from '../types';

const TOKEN_KEY = 'purge_info_token';
const USER_KEY = 'purge_info_user';
const API_BASE = (
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
  ''
).replace(/\/+$/, '');

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function setUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function clearSession(): void {
  clearToken();
  setUser(null);
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If 401 Unauthorized, attempt to fetch a fresh token from active Firebase session and retry once
  if (response.status === 401 && typeof window !== 'undefined') {
    try {
      const { auth } = await import('./firebase');
      if (auth?.currentUser) {
        const freshToken = await auth.currentUser.getIdToken(true);
        if (freshToken) {
          setToken(freshToken);
          headers['Authorization'] = `Bearer ${freshToken}`;
          response = await fetch(url, {
            ...options,
            headers,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data && data.error) || `Erreur serveur (${response.status})`);
  }

  return data as T;
}

export const api = {
  getToken,
  setToken,
  clearToken,
  getUser,
  setUser,
  clearSession,
  request,

  // Auth
  async login(credentials: { email: string; password: string }) {
    const data = await request<{ token: string; user: User; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setToken(data.token);
    if (data.user) {
      setUser(data.user);
    }
    return data;
  },

  async register(formData: any) {
    const data = await request<{ token: string; user: User; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    setToken(data.token);
    if (data.user) {
      setUser(data.user);
    }
    return data;
  },

  async getMe() {
    const res = await request<{ user: User; unreadNotifs: number; bookmarksCount: number }>('/api/auth/me');
    if (res && res.user) {
      setUser(res.user);
    }
    return res;
  },

  async updateProfile(profileData: Partial<User>) {
    const res = await request<{ user: User; message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    if (res && res.user) {
      setUser(res.user);
    }
    return res;
  },

  async removeAvatar() {
    return request<{ user: User; message: string }>('/api/auth/profile/avatar', {
      method: 'DELETE',
    });
  },

  async removeCover() {
    return request<{ user: User; message: string }>('/api/auth/profile/cover', {
      method: 'DELETE',
    });
  },

  async forgotPassword(email: string) {
    return request<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Categories
  async getCategories() {
    return request<{ categories: Category[] }>('/api/categories');
  },

  async createCategory(cat: { name: string; slug: string; description: string; icon?: string }) {
    return request<{ category: Category; message: string }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(cat),
    });
  },

  async updateCategory(id: string, cat: Partial<Category>) {
    return request<{ category: Category; message: string }>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cat),
    });
  },

  async deleteCategory(id: string) {
    return request<{ message: string }>(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  },

  // Articles
  async getArticles(
    params: {
      feed?: 'foryou' | 'following' | 'latest' | 'trending';
      category?: string;
      tag?: string;
      search?: string;
      authorId?: string;
      status?: string;
      filter?: string;
      sort?: 'latest' | 'popular' | 'views' | 'likes';
      dateRange?: 'all' | 'today' | 'week' | 'month' | 'year';
      page?: number;
      limit?: number;
    } = {}
  ) {
    const query = new URLSearchParams();
    if (params.feed) query.set('feed', params.feed);
    if (params.filter) query.set('filter', params.filter);
    if (params.category) query.set('category', params.category);
    if (params.tag) query.set('tag', params.tag);
    if (params.search) query.set('search', params.search);
    if (params.authorId) query.set('authorId', params.authorId);
    if (params.status) query.set('status', params.status);
    if (params.sort) query.set('sort', params.sort);
    if (params.dateRange) query.set('dateRange', params.dateRange);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    return request<{ articles: Article[]; total: number; page: number; limit: number; hasMore: boolean }>(
      `/api/articles?${query.toString()}`
    );
  },

  async getTags() {
    return request<{ tags: { tag: string; count: number }[] }>('/api/articles/tags');
  },

  // Search & Discovery
  async searchGlobal(params: {
    q?: string;
    type?: 'all' | 'articles' | 'journalists' | 'media' | 'categories' | 'tags';
    category?: string;
    tag?: string;
    date?: string;
    sort?: string;
    authorId?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.type) query.set('type', params.type);
    if (params.category) query.set('category', params.category);
    if (params.tag) query.set('tag', params.tag);
    if (params.date) query.set('date', params.date);
    if (params.sort) query.set('sort', params.sort);
    if (params.authorId) query.set('authorId', params.authorId);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    return request<{
      query: string;
      type: string;
      totalArticles: number;
      totalJournalists: number;
      totalMedia: number;
      totalCategories: number;
      totalTags: number;
      articles: {
        items: Article[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
      };
      journalists: {
        items: User[];
        total: number;
      };
      media: {
        items: {
          id: string;
          name: string;
          logo?: string;
          bio?: string;
          isVerified: boolean;
          articlesCount: number;
          journalistsCount: number;
          followersCount: number;
          isFollowing: boolean;
        }[];
        total: number;
      };
      categories: {
        items: (Category & { articleCount: number })[];
        total: number;
      };
      tags: {
        items: { tag: string; count: number }[];
        total: number;
      };
    }>(`/api/search?${query.toString()}`);
  },

  async getSearchSuggestions(q: string) {
    return request<{
      articles: { id: string; title: string; categoryName: string; coverImage: string; authorName: string }[];
      journalists: { id: string; name: string; avatar?: string; mediaName?: string; isVerified?: boolean; role?: string }[];
      media: { id: string; name: string; logo?: string; isVerified?: boolean }[];
      categories: { id: string; name: string; slug: string; articleCount: number }[];
      tags: { tag: string; count: number }[];
    }>(`/api/search/suggestions?q=${encodeURIComponent(q)}`);
  },

  async getDiscoveryData() {
    return request<{
      popularArticles: Article[];
      recentArticles: Article[];
      popularJournalists: User[];
      popularMedia: {
        id: string;
        name: string;
        logo?: string;
        bio?: string;
        isVerified: boolean;
        articlesCount: number;
        followersCount: number;
        isFollowing: boolean;
      }[];
      popularCategories: (Category & { articleCount: number })[];
      popularTags: { tag: string; count: number }[];
      totalArticles: number;
    }>('/api/search/discovery');
  },

  async getArticle(id: string) {
    return request<{ article: Article }>(`/api/articles/${id}`);
  },

  async recordView(id: string) {
    return request<{ viewsCount: number }>(`/api/articles/${id}/view`, {
      method: 'POST',
    });
  },

  async createArticle(data: {
    title: string;
    summary?: string;
    content: string;
    categoryId: string;
    tags?: string[];
    coverImage?: string;
    images?: string[];
    status?: 'published' | 'draft';
    poll?: any;
    [key: string]: any;
  }) {
    return request<{ article: Article; message: string }>('/api/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateArticle(id: string, data: Partial<Article> & { poll?: any }) {
    return request<{ article: Article; message: string }>(`/api/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async votePoll(articleId: string, optionId: string) {
    return request<{ poll: Poll; message: string }>(`/api/articles/${articleId}/poll/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    });
  },

  async deleteArticle(id: string) {
    return request<{ message: string }>(`/api/articles/${id}`, {
      method: 'DELETE',
    });
  },

  async toggleLikeArticle(id: string) {
    return request<{ liked: boolean; likesCount: number }>(`/api/articles/${id}/like`, {
      method: 'POST',
    });
  },

  async toggleBookmarkArticle(id: string) {
    return request<{ bookmarked: boolean }>(`/api/articles/${id}/bookmark`, {
      method: 'POST',
    });
  },

  async getComments(articleId: string) {
    return request<{ comments: Comment[]; total: number }>(`/api/articles/${articleId}/comments`);
  },

  async addComment(articleId: string, content: string, parentId?: string) {
    return request<{ comment: Comment; message: string }>(`/api/articles/${articleId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId }),
    });
  },

  async updateComment(articleId: string, commentId: string, content: string) {
    return request<{ comment: Comment; message: string }>(`/api/articles/${articleId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  async deleteComment(articleId: string, commentId: string) {
    return request<{ commentsCount: number; message: string }>(`/api/articles/${articleId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  },

  async toggleLikeComment(articleId: string, commentId: string) {
    return request<{ liked: boolean; likesCount: number }>(`/api/articles/${articleId}/comments/${commentId}/like`, {
      method: 'POST',
    });
  },

  async reportComment(articleId: string, commentId: string, reason: string, details?: string) {
    return request<{ message: string }>(`/api/articles/${articleId}/comments/${commentId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    });
  },

  async reportArticle(articleId: string, reason: string, details?: string) {
    return request<{ message: string }>(`/api/articles/${articleId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    });
  },

  // Users & Profiles
  async getUserProfile(id: string) {
    return request<{ user: User; articles: Article[] }>(`/api/users/${id}`);
  },

  async getJournalists() {
    return request<{ journalists: User[] }>('/api/users/journalists');
  },

  async toggleFollow(id: string) {
    return request<{ isFollowing: boolean; followersCount: number; isVerified: boolean; newlyVerified?: boolean }>(
      `/api/users/${id}/follow`,
      {
        method: 'POST',
      }
    );
  },

  async followUser(id: string) {
    return this.toggleFollow(id);
  },

  async getBookmarks() {
    return request<{ bookmarks: Article[] }>('/api/users/me/bookmarks');
  },

  async getMyBookmarks() {
    return request<{ bookmarks: Article[] }>('/api/users/me/bookmarks');
  },

  async getNotifications() {
    return request<{ notifications: Notification[] }>('/api/users/me/notifications');
  },

  async getMyNotifications() {
    return request<{ notifications: Notification[] }>('/api/users/me/notifications');
  },

  async markNotificationRead(id: string) {
    return request<{ success: boolean }>(`/api/users/me/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  async markAllNotificationsRead() {
    return request<{ success: boolean }>('/api/users/me/notifications/read-all', {
      method: 'PUT',
    });
  },

  async requestVerification(data: {
    mediaName?: string;
    pressCardNumber: string;
    motivation: string;
    documentUrl?: string;
  }) {
    return request<{ message: string; request: VerificationRequest }>(
      '/api/users/me/request-verification',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async reportUser(userId: string, reason: string, details?: string) {
    return request<{ message: string }>(`/api/users/${userId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    });
  },

  // -------------------------------------------------------------
  // Admin Endpoints
  // -------------------------------------------------------------
  async getAdminStats() {
    return request<{ stats: PlatformStats }>('/api/admin/stats');
  },

  async getAdminUsers(params?: { q?: string; role?: string; status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.role) query.set('role', params.role);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return request<{
      users: (User & { articlesCount: number })[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/admin/users?${query.toString()}`);
  },

  async setAdminUserStatus(id: string, status: 'active' | 'suspended', reason?: string) {
    return request<{ message: string; user: User }>(`/api/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    });
  },

  async setAdminUserRole(id: string, role: UserRole) {
    return request<{ message: string; user: User }>(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  async toggleAdminUserVerification(id: string, isVerified: boolean) {
    return request<{ message: string; user: User }>(`/api/admin/users/${id}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ isVerified }),
    });
  },

  async getAdminJournalists(params?: { q?: string; verifiedOnly?: boolean }) {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.verifiedOnly) query.set('verifiedOnly', 'true');
    return request<{ journalists: (User & { articlesCount: number; followersCount: number })[] }>(
      `/api/admin/journalists?${query.toString()}`
    );
  },

  async getAdminVerificationRequests(status?: string) {
    const query = status && status !== 'all' ? `?status=${status}` : '';
    return request<{ requests: VerificationRequest[] }>(`/api/admin/verification-requests${query}`);
  },

  async processAdminVerification(id: string, status: 'approved' | 'rejected' | 'pending', adminNotes?: string) {
    return request<{ message: string; request: VerificationRequest }>(
      `/api/admin/verification-requests/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ status, adminNotes }),
      }
    );
  },

  async getAdminArticles(params?: { q?: string; status?: string; categoryId?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.status) query.set('status', params.status);
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return request<{
      articles: Article[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/admin/articles?${query.toString()}`);
  },

  async setAdminArticleStatus(id: string, status: 'published' | 'hidden' | 'draft' | 'deleted', reason?: string) {
    return request<{ message: string; article: Article }>(`/api/admin/articles/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    });
  },

  async deleteAdminArticle(id: string, hardDelete?: boolean) {
    const query = hardDelete ? '?hardDelete=true' : '';
    return request<{ message: string }>(`/api/admin/articles/${id}${query}`, {
      method: 'DELETE',
    });
  },

  async getAdminComments(params?: { q?: string; status?: string; reportedOnly?: boolean; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.status) query.set('status', params.status);
    if (params?.reportedOnly) query.set('reportedOnly', 'true');
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return request<{
      comments: Comment[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/admin/comments?${query.toString()}`);
  },

  async setAdminCommentStatus(id: string, status: 'active' | 'hidden', reason?: string) {
    return request<{ message: string; comment: Comment }>(`/api/admin/comments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    });
  },

  async deleteAdminComment(id: string) {
    return request<{ message: string }>(`/api/admin/comments/${id}`, {
      method: 'DELETE',
    });
  },

  async getAdminReports(params?: { status?: string; targetType?: string; q?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.targetType) query.set('targetType', params.targetType);
    if (params?.q) query.set('q', params.q);
    return request<{ reports: Report[] }>(`/api/admin/reports?${query.toString()}`);
  },

  async processAdminReport(
    id: string,
    status: 'resolved' | 'rejected' | 'dismissed' | 'reviewing',
    action?: string,
    adminNotes?: string
  ) {
    return request<{ message: string; report: Report }>(`/api/admin/reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, action, adminNotes }),
    });
  },

  async getAdminCategories() {
    return request<{ categories: Category[] }>('/api/admin/categories');
  },

  async createAdminCategory(data: Partial<Category>) {
    return request<{ message: string; category: Category }>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAdminCategory(id: string, data: Partial<Category>) {
    return request<{ message: string; category: Category }>(`/api/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteAdminCategory(id: string) {
    return request<{ message: string }>(`/api/admin/categories/${id}`, {
      method: 'DELETE',
    });
  },

  async getAdminMedia(q?: string) {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return request<{ mediaHouses: MediaHouse[] }>(`/api/admin/media${query}`);
  },

  async createAdminMedia(data: Partial<MediaHouse>) {
    return request<{ message: string; media: MediaHouse }>('/api/admin/media', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAdminMedia(id: string, data: Partial<MediaHouse>) {
    return request<{ message: string; media: MediaHouse }>(`/api/admin/media/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async toggleAdminMediaVerification(id: string, isVerified: boolean) {
    return request<{ message: string; media: MediaHouse }>(`/api/admin/media/${id}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ isVerified }),
    });
  },

  async setAdminMediaStatus(id: string, status: 'active' | 'suspended', reason?: string) {
    return request<{ message: string; media: MediaHouse }>(`/api/admin/media/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    });
  },

  async deleteAdminMedia(id: string, reason?: string) {
    return request<{ message: string }>(`/api/admin/media/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  },

  async revokeJournalistRole(userId: string, reason?: string) {
    return request<{ message: string; user: User }>(`/api/admin/users/${userId}/revoke-journalist`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  },

  async getAdminLogs(params?: { targetType?: string; action?: string; q?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.targetType) query.set('targetType', params.targetType);
    if (params?.action) query.set('action', params.action);
    if (params?.q) query.set('q', params.q);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return request<{
      logs: AdminLog[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/admin/logs?${query.toString()}`);
  },

  async getMediaRecords(params?: { type?: string; usageType?: string; articleId?: string }) {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.usageType) query.set('usageType', params.usageType);
    if (params?.articleId) query.set('articleId', params.articleId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ mediaRecords: MediaRecord[]; total: number }>(`/api/media${qs}`);
  },

  async deleteMediaRecord(publicId: string) {
    return request<{ success: boolean; message: string }>(`/api/media/${encodeURIComponent(publicId)}`, {
      method: 'DELETE',
    });
  },

  // Media Houses (Maisons de Journalistes - Max 5 journalists)
  async getMediaHouses(q?: string) {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return request<{ mediaHouses: MediaHouse[] }>(`/api/media-houses${query}`);
  },

  async getMyMediaHouse() {
    return request<{
      house: MediaHouse | null;
      articles?: Article[];
      stats?: {
        totalViews: number;
        totalLikes: number;
        totalComments: number;
        totalArticles: number;
      };
      isChef?: boolean;
      maxJournalists?: number;
      canAddMembers?: boolean;
    }>('/api/media-houses/my-house');
  },

  async getAvailableJournalists() {
    return request<{ journalists: (User & { currentHouseId?: string; currentHouseName?: string; isAvailable: boolean })[] }>(
      '/api/media-houses/available-journalists'
    );
  },

  async getMediaHouseById(id: string) {
    return request<{ house: MediaHouse; articles: Article[] }>(`/api/media-houses/${id}`);
  },

  async createMediaHouse(data: Partial<MediaHouse>) {
    return request<{ message: string; house: MediaHouse }>('/api/media-houses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateMediaHouse(id: string, data: Partial<MediaHouse>) {
    return request<{ message: string; house: MediaHouse }>(`/api/media-houses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async assignMemberRole(houseId: string, memberId: string, title: string) {
    return request<{ message: string; memberRoles: Record<string, string>; house: MediaHouse }>(
      `/api/media-houses/${houseId}/members/${memberId}/role`,
      {
        method: 'PUT',
        body: JSON.stringify({ title }),
      }
    );
  },

  async addEditorialNote(houseId: string, content: string, priority: 'urgent' | 'standard' | 'investigation') {
    return request<{ message: string; note: any; house: MediaHouse }>(`/api/media-houses/${houseId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content, priority }),
    });
  },

  async deleteEditorialNote(houseId: string, noteId: string) {
    return request<{ message: string; house: MediaHouse }>(`/api/media-houses/${houseId}/notes/${noteId}`, {
      method: 'DELETE',
    });
  },

  async addMediaHouseMember(houseId: string, journalistId: string) {
    return request<{ message: string; house: MediaHouse }>(`/api/media-houses/${houseId}/members`, {
      method: 'POST',
      body: JSON.stringify({ journalistId }),
    });
  },

  async removeMediaHouseMember(houseId: string, memberId: string) {
    return request<{ message: string; house: MediaHouse }>(`/api/media-houses/${houseId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },

  async deleteMediaHouse(houseId: string, reason?: string) {
    return request<{ message: string }>(`/api/media-houses/${houseId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  },

  async followMediaHouse(houseId: string) {
    return request<{ isFollowing: boolean; followersCount: number; isVerified: boolean; newlyVerified?: boolean }>(
      `/api/media-houses/${houseId}/follow`,
      {
        method: 'POST',
      }
    );
  },

  async getMasterAccounts() {
    return request<{
      masterAccounts: {
        email: string;
        isRegistered: boolean;
        name: string;
        id?: string;
        role: string;
        avatar?: string;
        lastLoginAt?: string;
      }[];
      maxAccounts: number;
    }>('/api/admin/master-accounts');
  },

  // Rankings API (Top 7 Houses & Journalists)
  async getTop7Houses() {
    return request<{
      topHouses: TopMediaHouse[];
      total: number;
      lastUpdated: string;
    }>('/api/media-houses/top-7');
  },

  async getTop7Journalists() {
    return request<{
      topJournalists: TopJournalist[];
      total: number;
      lastUpdated: string;
    }>('/api/users/top-7-journalists');
  },

  async getTopRankings(): Promise<RankingsResponse> {
    const [housesRes, journalistsRes] = await Promise.all([
      request<{ topHouses: TopMediaHouse[]; total: number; lastUpdated: string }>('/api/media-houses/top-7'),
      request<{ topJournalists: TopJournalist[]; total: number; lastUpdated: string }>('/api/users/top-7-journalists'),
    ]);

    return {
      topHouses: housesRes.topHouses,
      topJournalists: journalistsRes.topJournalists,
      totalHousesCount: housesRes.total,
      totalJournalistsCount: journalistsRes.total,
      lastUpdated: housesRes.lastUpdated || new Date().toISOString(),
    };
  },
};
