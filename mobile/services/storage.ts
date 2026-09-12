/**
 * Service de stockage persistant pour l'application mobile PURGE (React Native & Expo)
 * Utilise @react-native-async-storage/async-storage avec fallback mémoire transparent.
 */

let asyncStorageModule: any = null;
try {
  // Tentative de chargement dynamique d'AsyncStorage
  asyncStorageModule = require('@react-native-async-storage/async-storage').default;
} catch {
  // Fallback silencieux si non encore initialisé
  asyncStorageModule = null;
}

const memoryStore = new Map<string, string>();

export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (asyncStorageModule?.getItem) {
        return await asyncStorageModule.getItem(key);
      }
      return memoryStore.get(key) || null;
    } catch (e) {
      console.warn(`[Storage] Erreur lecture ${key}:`, e);
      return memoryStore.get(key) || null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      memoryStore.set(key, value);
      if (asyncStorageModule?.setItem) {
        await asyncStorageModule.setItem(key, value);
      }
    } catch (e) {
      console.warn(`[Storage] Erreur écriture ${key}:`, e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      memoryStore.delete(key);
      if (asyncStorageModule?.removeItem) {
        await asyncStorageModule.removeItem(key);
      }
    } catch (e) {
      console.warn(`[Storage] Erreur suppression ${key}:`, e);
    }
  },

  async clear(): Promise<void> {
    try {
      memoryStore.clear();
      if (asyncStorageModule?.clear) {
        await asyncStorageModule.clear();
      }
    } catch (e) {
      console.warn('[Storage] Erreur nettoyage:', e);
    }
  },
};
