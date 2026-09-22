import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article, User } from '../types';
import { api } from '../services/api';
import { ArticleCard } from '../components/ArticleCard';
import { AppIcon } from '../components/AppIcon';

const OFFLINE_CACHE_KEY = '@purge_offline_bookmarks_cache';
const BOOKMARK_FOLDERS_KEY = '@purge_bookmarks_folders';
const CUSTOM_FOLDERS_KEY = '@purge_custom_folders';

const DEFAULT_FOLDERS = [
  'all',
  'Enquêtes sensibles',
  'Politique & Décrets',
  'À lire plus tard',
  'Analyses de fond',
];

interface BookmarksScreenProps {
  currentUser: User | null;
  onSelectArticle: (article: Article) => void;
  onOpenFeed: () => void;
  onOpenAuth: () => void;
}

export const BookmarksScreen: React.FC<BookmarksScreenProps> = ({
  currentUser,
  onSelectArticle,
  onOpenFeed,
  onOpenAuth,
}) => {
  const [bookmarks, setBookmarks] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Dossiers thématiques
  const [folders, setFolders] = useState<string[]>(DEFAULT_FOLDERS);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [articleFolderMap, setArticleFolderMap] = useState<Record<string, string>>({});
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [assignFolderArticle, setAssignFolderArticle] = useState<Article | null>(null);

  // Cache Hors-Ligne
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [cachedCount, setCachedCount] = useState<number>(0);

  // Initialisation des dossiers et du mapping sauvegardé
  useEffect(() => {
    loadFoldersAndMapping();
  }, []);

  const loadFoldersAndMapping = async () => {
    try {
      const [storedFolders, storedMapping] = await Promise.all([
        AsyncStorage.getItem(CUSTOM_FOLDERS_KEY),
        AsyncStorage.getItem(BOOKMARK_FOLDERS_KEY),
      ]);
      if (storedFolders) {
        const parsed = JSON.parse(storedFolders);
        if (Array.isArray(parsed)) {
          const merged = Array.from(new Set([...DEFAULT_FOLDERS, ...parsed]));
          setFolders(merged);
        }
      }
      if (storedMapping) {
        setArticleFolderMap(JSON.parse(storedMapping));
      }
    } catch (e) {
      console.warn('Erreur chargement dossiers thématiques:', e);
    }
  };

  const saveFolderMapping = async (newMap: Record<string, string>) => {
    setArticleFolderMap(newMap);
    try {
      await AsyncStorage.setItem(BOOKMARK_FOLDERS_KEY, JSON.stringify(newMap));
    } catch (e) {
      console.warn('Erreur persistance mapping dossiers:', e);
    }
  };

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      Alert.alert('Nom requis', 'Veuillez saisir un intitulé pour le dossier.');
      return;
    }
    if (folders.includes(trimmed)) {
      Alert.alert('Dossier existant', 'Ce dossier thématique existe déjà.');
      return;
    }

    const updatedFolders = [...folders, trimmed];
    setFolders(updatedFolders);
    setSelectedFolder(trimmed);
    setNewFolderName('');
    setShowNewFolderModal(false);

    try {
      const customOnes = updatedFolders.filter((f) => !DEFAULT_FOLDERS.includes(f));
      await AsyncStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(customOnes));
    } catch (e) {
      console.warn('Erreur sauvegarde dossier:', e);
    }
  };

  const handleAssignFolder = async (articleId: string, folder: string) => {
    const nextMap = { ...articleFolderMap, [articleId]: folder };
    await saveFolderMapping(nextMap);
    setAssignFolderArticle(null);
  };

  const fetchBookmarks = async (isRefresh = false) => {
    if (!currentUser) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.getBookmarks();
      if (res.bookmarks) {
        const enriched = res.bookmarks.map((a) => ({ ...a, isBookmarked: true }));
        setBookmarks(enriched);
        setCachedCount(enriched.length);
        setIsOfflineMode(false);

        // Sauvegarde dans le cache hors-ligne
        await AsyncStorage.setItem(
          OFFLINE_CACHE_KEY,
          JSON.stringify({
            bookmarks: enriched,
            savedAt: new Date().toISOString(),
          })
        );
      }
    } catch (e) {
      console.warn('Erreur chargement favoris en ligne, bascule sur cache hors-ligne:', e);
      // Récupération depuis le cache hors-ligne local
      try {
        const cachedRaw = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (parsed.bookmarks && Array.isArray(parsed.bookmarks)) {
            setBookmarks(parsed.bookmarks);
            setCachedCount(parsed.bookmarks.length);
            setIsOfflineMode(true);
          }
        }
      } catch (cacheErr) {
        console.warn('Erreur lecture cache hors-ligne:', cacheErr);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, [currentUser]);

  const handleRemoveBookmark = async (article: Article) => {
    setBookmarks((prev) => prev.filter((a) => a.id !== article.id));
    try {
      await api.toggleBookmarkArticle(article.id);
    } catch (err) {
      fetchBookmarks();
    }
  };

  const handleClearAll = () => {
    if (bookmarks.length === 0) return;
    Alert.alert(
      'Vider les favoris',
      'Voulez-vous vraiment retirer toutes vos enquêtes archivées ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout retirer',
          style: 'destructive',
          onPress: async () => {
            const idsToRemove = bookmarks.map((b) => b.id);
            setBookmarks([]);
            for (const id of idsToRemove) {
              try {
                await api.toggleBookmarkArticle(id);
              } catch (e) {
                // Ignore individual toggle failures
              }
            }
          },
        },
      ]
    );
  };

  // Categories extracted from bookmarks
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    bookmarks.forEach((b) => {
      const cat = b.categoryName || (b as any).category || b.categoryId;
      if (cat) cats.add(cat);
    });
    return ['all', ...Array.from(cats)];
  }, [bookmarks]);

  // Total estimated read time
  const totalReadMinutes = useMemo(() => {
    return bookmarks.reduce((acc, b) => acc + (b.readTime || 4), 0);
  }, [bookmarks]);

  // Filtered bookmarks by search, category and folder
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((art) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        (art as any).category === selectedCategory ||
        art.categoryName === selectedCategory ||
        art.categoryId === selectedCategory;

      if (!matchesCategory) return false;

      const articleFolder = articleFolderMap[art.id] || 'all';
      const matchesFolder = selectedFolder === 'all' || articleFolder === selectedFolder;
      if (!matchesFolder) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        art.title.toLowerCase().includes(q) ||
        (art.summary && art.summary.toLowerCase().includes(q)) ||
        (art.authorName && art.authorName.toLowerCase().includes(q)) ||
        (art.mediaName && art.mediaName.toLowerCase().includes(q))
      );
    });
  }, [bookmarks, searchQuery, selectedCategory, selectedFolder, articleFolderMap]);

  if (!currentUser) {
    return (
      <View style={styles.centerContainer}>
        <AppIcon name="bookmark" size={48} color="#00d2ff" style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Articles Enregistrés</Text>
        <Text style={styles.sub}>
          Connectez-vous pour retrouver vos enquêtes et dépêches sauvegardées sur tous vos appareils.
        </Text>
        <TouchableOpacity style={styles.authBtn} onPress={onOpenAuth} activeOpacity={0.8}>
          <Text style={styles.authBtnText}>SE CONNECTER</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Bannière Hors-Ligne si applicable */}
      {isOfflineMode && (
        <View style={styles.offlineBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppIcon name="cloud-offline" size={14} color="#00d2ff" style={{ marginRight: 6 }} />
            <Text style={styles.offlineBannerText}>
              Mode Hors-Ligne actif • {cachedCount} enquête{cachedCount > 1 ? 's' : ''} disponible{cachedCount > 1 ? 's' : ''} en local
            </Text>
          </View>
        </View>
      )}

      {/* En-tête avec métriques */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Mes Favoris ({bookmarks.length})</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <AppIcon name="time" size={12} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.headerSubtitle}>
                ~{totalReadMinutes} min de lecture archivée
              </Text>
            </View>
          </View>
          {bookmarks.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn} activeOpacity={0.7}>
              <Text style={styles.clearAllText}>Vider</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Barre de recherche locale */}
        {bookmarks.length > 0 && (
          <View style={styles.searchBox}>
            <AppIcon name="search" size={16} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Filtrer dans vos favoris..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <AppIcon name="close" size={14} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Sélecteur de Dossiers Thématiques */}
        {bookmarks.length > 0 && (
          <View style={styles.folderSection}>
            <View style={styles.folderHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="folder" size={13} color="#00d2ff" style={{ marginRight: 5 }} />
                <Text style={styles.folderSectionTitle}>DOSSIERS THÉMATIQUES</Text>
              </View>
              <TouchableOpacity
                style={styles.newFolderBtn}
                onPress={() => setShowNewFolderModal(true)}
              >
                <Text style={styles.newFolderBtnText}>+ NOUVEAU DOSSIER</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.folderScroll}
            >
              {folders.map((folder) => {
                const count =
                  folder === 'all'
                    ? bookmarks.length
                    : bookmarks.filter((b) => articleFolderMap[b.id] === folder).length;
                return (
                  <TouchableOpacity
                    key={folder}
                    style={[
                      styles.folderChip,
                      selectedFolder === folder && styles.folderChipActive,
                    ]}
                    onPress={() => setSelectedFolder(folder)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <AppIcon
                        name={folder === 'all' ? 'folder-open' : 'folder'}
                        size={12}
                        color={selectedFolder === folder ? '#00d2ff' : '#94a3b8'}
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[
                          styles.folderChipText,
                          selectedFolder === folder && styles.folderChipTextActive,
                        ]}
                      >
                        {folder === 'all' ? 'Tous les favoris' : folder} ({count})
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Filtres par catégories */}
        {bookmarks.length > 0 && availableCategories.length > 2 && (
          <View style={styles.categoryPillsRow}>
            {availableCategories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catPill,
                  selectedCategory === cat && styles.catPillActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.catPillText,
                    selectedCategory === cat && styles.catPillTextActive,
                  ]}
                >
                  {cat === 'all' ? 'Toutes' : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00d2ff" />
        </View>
      ) : (
        <FlatList
          data={filteredBookmarks}
          keyExtractor={(item: Article) => item.id}
          renderItem={({ item }: { item: Article }) => {
            const currentFolder = articleFolderMap[item.id];
            return (
              <View style={styles.articleCardWrapper}>
                <ArticleCard
                  article={item}
                  onPress={() => onSelectArticle(item)}
                  onToggleBookmark={() => handleRemoveBookmark(item)}
                />
                <View style={styles.articleFolderBar}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                    <AppIcon name="folder" size={11} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={styles.articleFolderLabel} numberOfLines={1}>
                      {currentFolder ? `Classé dans : ${currentFolder}` : 'Non classé dans un dossier'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changeFolderBtn}
                    onPress={() => setAssignFolderArticle(item)}
                  >
                    <Text style={styles.changeFolderBtnText}>Changer de dossier</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <AppIcon name="bookmark-outline" size={40} color="#64748b" style={{ marginBottom: 12 }} />
              <Text style={styles.title}>
                {searchQuery || selectedCategory !== 'all' || selectedFolder !== 'all'
                  ? 'Aucun résultat correspondant'
                  : 'Aucun article enregistré'}
              </Text>
              <Text style={styles.sub}>
                {searchQuery || selectedCategory !== 'all' || selectedFolder !== 'all'
                  ? 'Modifiez vos filtres de dossier, catégorie ou terme de recherche.'
                  : "Appuyez sur l'icône de signet d'un article dans le fil pour l'ajouter à vos favoris."}
              </Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={onOpenFeed} activeOpacity={0.8}>
                <Text style={styles.exploreBtnText}>EXPLORER LE FIL D'ACTUALITÉS</Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchBookmarks(true)}
              tintColor="#00d2ff"
              colors={['#00d2ff']}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal Création Nouveau Dossier */}
      <Modal
        visible={showNewFolderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewFolderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <AppIcon name="folder" size={18} color="#00d2ff" style={{ marginRight: 8 }} />
              <Text style={styles.modalTitle}>Nouveau Dossier Thématique</Text>
            </View>
            <Text style={styles.modalSub}>
              Organisez vos enquêtes citoyennes par sujet ou niveau de priorité.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Dossier Révélations 2026"
              placeholderTextColor="#64748b"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setNewFolderName('');
                  setShowNewFolderModal(false);
                }}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleCreateFolder}
              >
                <Text style={styles.modalConfirmText}>Créer le dossier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Affectation à un Dossier */}
      <Modal
        visible={Boolean(assignFolderArticle)}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignFolderArticle(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <AppIcon name="folder" size={18} color="#00d2ff" style={{ marginRight: 8 }} />
              <Text style={styles.modalTitle}>Classer l'enquête</Text>
            </View>
            <Text style={styles.modalSub} numberOfLines={2}>
              {assignFolderArticle?.title}
            </Text>
            <ScrollView style={{ maxHeight: 220, marginVertical: 8 }}>
              {folders
                .filter((f) => f !== 'all')
                .map((folder) => {
                  const isAssigned =
                    assignFolderArticle && articleFolderMap[assignFolderArticle.id] === folder;
                  return (
                    <TouchableOpacity
                      key={folder}
                      style={[
                        styles.folderSelectItem,
                        isAssigned && styles.folderSelectItemActive,
                      ]}
                      onPress={() => {
                        if (assignFolderArticle) {
                          handleAssignFolder(assignFolderArticle.id, folder);
                        }
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <AppIcon
                          name="folder"
                          size={14}
                          color={isAssigned ? '#00d2ff' : '#94a3b8'}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={[
                            styles.folderSelectText,
                            isAssigned && styles.folderSelectTextActive,
                          ]}
                        >
                          {folder}
                        </Text>
                      </View>
                      {isAssigned && <AppIcon name="checkmark" size={14} color="#00d2ff" />}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAssignFolderArticle(null)}
              >
                <Text style={styles.modalCancelText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020512',
  },
  header: {
    padding: 16,
    backgroundColor: '#070d1e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#00d2ff',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  clearAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  clearAllText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1228',
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.2)',
    height: 40,
    marginTop: 6,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  clearIcon: {
    color: '#94a3b8',
    fontSize: 14,
    padding: 4,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  catPillActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    borderColor: '#00d2ff',
  },
  catPillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  catPillTextActive: {
    color: '#00d2ff',
  },
  listContent: {
    paddingVertical: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconBig: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  sub: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  authBtn: {
    backgroundColor: '#1d68ff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00d2ff',
  },
  authBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  exploreBtn: {
    backgroundColor: '#0c1228',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00d2ff',
  },
  exploreBtnText: {
    color: '#00d2ff',
    fontSize: 12,
    fontWeight: '800',
  },
  // Bannière Hors-Ligne
  offlineBanner: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Section Dossiers Thématiques
  folderSection: {
    marginTop: 12,
    gap: 8,
  },
  folderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  folderSectionTitle: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  newFolderBtn: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  newFolderBtnText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  folderScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  folderChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  folderChipActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: '#06b6d4',
  },
  folderChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  folderChipTextActive: {
    color: '#38bdf8',
    fontWeight: '800',
  },
  // Wrapper Article Card & Barre de classement
  articleCardWrapper: {
    marginBottom: 8,
  },
  articleFolderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070d1e',
    marginHorizontal: 16,
    marginTop: -8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  articleFolderLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  changeFolderBtn: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  changeFolderBtnText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
  },
  // Modals (Création & Affectation)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 5, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0c142c',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    gap: 10,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  modalSub: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  modalInput: {
    backgroundColor: '#060c1d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalCancelText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalConfirmText: {
    color: '#020512',
    fontSize: 12,
    fontWeight: '900',
  },
  folderSelectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  folderSelectItemActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: '#06b6d4',
  },
  folderSelectText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  folderSelectTextActive: {
    color: '#38bdf8',
    fontWeight: '800',
  },
});
