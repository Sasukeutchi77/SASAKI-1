import { Article } from '../types';

const BOOKMARKS_STORAGE_KEY = 'purge_info_local_bookmarks';
const BOOKMARKS_EVENT = 'purge_bookmarks_changed';

type BookmarkListener = (bookmarks: Article[]) => void;
const listeners = new Set<BookmarkListener>();

function notify(bookmarks: Article[]) {
  listeners.forEach((listener) => {
    try {
      listener(bookmarks);
    } catch (err) {
      console.error('Bookmark listener error:', err);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BOOKMARKS_EVENT, { detail: { bookmarks } }));
  }
}

export const bookmarksStorage = {
  /**
   * Get all locally stored bookmarked articles
   */
  getBookmarks(): Article[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  /**
   * Check if a specific article ID is bookmarked
   */
  isBookmarked(articleId: string): boolean {
    if (!articleId) return false;
    const bookmarks = this.getBookmarks();
    return bookmarks.some((b) => b.id === articleId);
  },

  /**
   * Save an article into bookmarks
   */
  saveBookmark(article: Article): void {
    if (!article || !article.id) return;
    const bookmarks = this.getBookmarks();
    const existingIndex = bookmarks.findIndex((b) => b.id === article.id);

    const enrichedArticle: Article = {
      ...article,
      isBookmarked: true,
    };

    let updated: Article[];
    if (existingIndex !== -1) {
      updated = [...bookmarks];
      updated[existingIndex] = { ...updated[existingIndex], ...enrichedArticle };
    } else {
      updated = [enrichedArticle, ...bookmarks];
    }

    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save bookmark to localStorage:', e);
    }

    notify(updated);
  },

  /**
   * Remove an article from bookmarks
   */
  removeBookmark(articleId: string): void {
    if (!articleId) return;
    const bookmarks = this.getBookmarks();
    const updated = bookmarks.filter((b) => b.id !== articleId);

    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update bookmarks in localStorage:', e);
    }

    notify(updated);
  },

  /**
   * Toggle bookmark status. Returns true if now bookmarked, false if removed.
   */
  toggleBookmark(article: Article): boolean {
    if (!article || !article.id) return false;
    if (this.isBookmarked(article.id)) {
      this.removeBookmark(article.id);
      return false;
    } else {
      this.saveBookmark(article);
      return true;
    }
  },

  /**
   * Sync and merge server bookmarks with local bookmarks (union without duplicates)
   */
  syncServerBookmarks(serverBookmarks: Article[]): Article[] {
    const local = this.getBookmarks();
    const map = new Map<string, Article>();

    // Add local first
    local.forEach((art) => {
      map.set(art.id, { ...art, isBookmarked: true });
    });

    // Merge server (server takes precedence for content freshness, but stays bookmarked)
    (serverBookmarks || []).forEach((art) => {
      map.set(art.id, { ...art, isBookmarked: true });
    });

    const merged = Array.from(map.values());
    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn('Failed to persist merged bookmarks:', e);
    }

    notify(merged);
    return merged;
  },

  /**
   * Get total count of bookmarked articles
   */
  getCount(): number {
    return this.getBookmarks().length;
  },

  /**
   * Subscribe to bookmarks changes
   */
  subscribe(listener: BookmarkListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
