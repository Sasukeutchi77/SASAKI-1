const LIKES_STORAGE_KEY = 'purge_info_local_likes';
const LIKES_EVENT = 'purge_likes_changed';

type LikesListener = (likedIds: string[]) => void;
const listeners = new Set<LikesListener>();

function notify(likedIds: string[]) {
  listeners.forEach((listener) => {
    try {
      listener(likedIds);
    } catch (err) {
      console.error('Likes listener error:', err);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LIKES_EVENT, { detail: { likedIds } }));
  }
}

export const likesStorage = {
  /**
   * Get list of liked article IDs from localStorage
   */
  getLikedIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LIKES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  /**
   * Check if a given article ID is currently liked
   */
  isLiked(articleId: string): boolean {
    if (!articleId) return false;
    const ids = this.getLikedIds();
    return ids.includes(articleId);
  },

  /**
   * Explicitly set like state for an article ID
   */
  setLiked(articleId: string, liked: boolean): void {
    if (!articleId) return;
    const current = new Set<string>(this.getLikedIds());
    if (liked) {
      current.add(articleId);
    } else {
      current.delete(articleId);
    }

    const updated: string[] = Array.from(current);
    try {
      localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save liked IDs to localStorage:', e);
    }

    notify(updated);
  },

  /**
   * Toggle like state for an article ID. Returns true if now liked, false if unliked.
   */
  toggleLike(articleId: string): boolean {
    if (!articleId) return false;
    const isCurrentlyLiked = this.isLiked(articleId);
    const nextLiked = !isCurrentlyLiked;
    this.setLiked(articleId, nextLiked);
    return nextLiked;
  },

  /**
   * Subscribe to likes changes
   */
  subscribe(listener: LikesListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
