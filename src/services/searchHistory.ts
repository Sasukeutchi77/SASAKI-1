const SEARCH_HISTORY_KEY = 'purge_info_search_history';
const MAX_HISTORY_ITEMS = 10;

export const searchHistory = {
  getSearches(): string[] {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  addSearch(query: string): string[] {
    const clean = query.trim();
    if (!clean || clean.length < 2) return this.getSearches();

    try {
      const existing = this.getSearches().filter(
        (item) => item.toLowerCase() !== clean.toLowerCase()
      );
      const updated = [clean, ...existing].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  removeSearch(query: string): string[] {
    try {
      const existing = this.getSearches().filter(
        (item) => item.toLowerCase() !== query.toLowerCase()
      );
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(existing));
      return existing;
    } catch {
      return [];
    }
  },

  clearAll(): void {
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // Ignored
    }
  },
};
