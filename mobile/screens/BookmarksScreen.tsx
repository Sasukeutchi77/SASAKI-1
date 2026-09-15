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
} from 'react-native';
import { Article, User } from '../types';
import { api } from '../services/api';
import { ArticleCard } from '../components/ArticleCard';

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
        setBookmarks(res.bookmarks.map((a) => ({ ...a, isBookmarked: true })));
      }
    } catch (e) {
      console.warn('Erreur chargement favoris:', e);
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
      const cat = b.category || b.categoryName;
      if (cat) cats.add(cat);
    });
    return ['all', ...Array.from(cats)];
  }, [bookmarks]);

  // Total estimated read time
  const totalReadMinutes = useMemo(() => {
    return bookmarks.reduce((acc, b) => acc + (b.readTime || 4), 0);
  }, [bookmarks]);

  // Filtered bookmarks by search and category
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((art) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        art.category === selectedCategory ||
        art.categoryName === selectedCategory;

      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        art.title.toLowerCase().includes(q) ||
        (art.summary && art.summary.toLowerCase().includes(q)) ||
        (art.authorName && art.authorName.toLowerCase().includes(q)) ||
        (art.mediaName && art.mediaName.toLowerCase().includes(q))
      );
    });
  }, [bookmarks, searchQuery, selectedCategory]);

  if (!currentUser) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.iconBig}>🔖</Text>
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
      {/* En-tête avec métriques */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Mes Favoris ({bookmarks.length})</Text>
            <Text style={styles.headerSubtitle}>
              ⏱️ ~{totalReadMinutes} min de lecture archivée
            </Text>
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
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Filtrer dans vos favoris..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
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
          renderItem={({ item }: { item: Article }) => (
            <ArticleCard
              article={item}
              onPress={() => onSelectArticle(item)}
              onToggleBookmark={() => handleRemoveBookmark(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyIcon}>📑</Text>
              <Text style={styles.title}>
                {searchQuery || selectedCategory !== 'all'
                  ? 'Aucun résultat correspondant'
                  : 'Aucun article enregistré'}
              </Text>
              <Text style={styles.sub}>
                {searchQuery || selectedCategory !== 'all'
                  ? 'Modifiez votre recherche ou réinitialisez les filtres de catégorie.'
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
});
