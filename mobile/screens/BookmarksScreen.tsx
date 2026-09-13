import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Favoris ({bookmarks.length})</Text>
        <Text style={styles.headerSubtitle}>Sauvegardés pour lecture ultérieure</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00d2ff" />
        </View>
      ) : (
        <FlatList
          data={bookmarks}
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
              <Text style={styles.title}>Aucun article enregistré</Text>
              <Text style={styles.sub}>
                Appuyez sur l'icône de signet d'un article dans le fil pour l'ajouter à vos favoris.
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
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
