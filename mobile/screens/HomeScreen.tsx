import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Article, Category } from '../types';
import { api } from '../services/api';
import { ArticleCard } from '../components/ArticleCard';
import { CategoryPills } from '../components/CategoryPills';

interface HomeScreenProps {
  onSelectArticle: (article: Article) => void;
  onRequireAuth?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectArticle,
  onRequireAuth,
}) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [feedType, setFeedType] = useState<'foryou' | 'trending' | 'latest'>('foryou');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await api.getCategories();
      if (res.categories) {
        setCategories(res.categories);
      }
    } catch (e) {
      console.warn('[HomeScreen] Erreur chargement catégories:', e);
    }
  };

  const fetchArticles = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await api.getArticles({
        feed: feedType,
        category: selectedCategoryId || undefined,
        limit: 25,
      });

      if (res.articles) {
        setArticles(res.articles);
      }
    } catch (err: any) {
      console.error('[HomeScreen] Erreur chargement articles:', err);
      setError(err.message || 'Impossible de charger le fil d’actualités.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [feedType, selectedCategoryId]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleToggleLike = async (article: Article) => {
    // Mise à jour optimiste
    const wasLiked = Boolean(article.isLiked);
    const newLikesCount = wasLiked ? Math.max(0, article.likesCount - 1) : article.likesCount + 1;

    setArticles((prev) =>
      prev.map((a) =>
        a.id === article.id ? { ...a, isLiked: !wasLiked, likesCount: newLikesCount } : a
      )
    );

    try {
      await api.toggleLikeArticle(article.id);
    } catch (err) {
      // Revert en cas d'erreur
      setArticles((prev) =>
        prev.map((a) =>
          a.id === article.id ? { ...a, isLiked: wasLiked, likesCount: article.likesCount } : a
        )
      );
      if (onRequireAuth) onRequireAuth();
    }
  };

  const handleToggleBookmark = async (article: Article) => {
    const wasBookmarked = Boolean(article.isBookmarked);
    setArticles((prev) =>
      prev.map((a) => (a.id === article.id ? { ...a, isBookmarked: !wasBookmarked } : a))
    );

    try {
      await api.toggleBookmarkArticle(article.id);
    } catch (err) {
      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, isBookmarked: wasBookmarked } : a))
      );
      if (onRequireAuth) onRequireAuth();
    }
  };

  const renderHeader = () => (
    <View>
      {/* Sélecteur de flux (Pour vous, À la une, Récents) */}
      <View style={styles.feedSelector}>
        <TouchableOpacity
          style={[styles.feedTab, feedType === 'foryou' && styles.activeFeedTab]}
          onPress={() => setFeedType('foryou')}
          activeOpacity={0.7}
        >
          <Text style={[styles.feedTabText, feedType === 'foryou' && styles.activeFeedTabText]}>
            Pour Vous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.feedTab, feedType === 'trending' && styles.activeFeedTab]}
          onPress={() => setFeedType('trending')}
          activeOpacity={0.7}
        >
          <Text style={[styles.feedTabText, feedType === 'trending' && styles.activeFeedTabText]}>
            À la Une 🔥
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.feedTab, feedType === 'latest' && styles.activeFeedTab]}
          onPress={() => setFeedType('latest')}
          activeOpacity={0.7}
        >
          <Text style={[styles.feedTabText, feedType === 'latest' && styles.activeFeedTabText]}>
            Récents ⏱
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filtres de catégories horizontaux */}
      <CategoryPills
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00d2ff" />
          <Text style={styles.loadingText}>Chargement des dépêches en direct...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchArticles()}>
            <Text style={styles.retryBtnText}>RÉESSAYER</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ArticleCard
              article={item}
              onPress={() => onSelectArticle(item)}
              onToggleLike={() => handleToggleLike(item)}
              onToggleBookmark={() => handleToggleBookmark(item)}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Aucune publication</Text>
              <Text style={styles.emptySub}>
                Aucun article ne correspond à cette sélection pour l'instant.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchArticles(true)}
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
  listContent: {
    paddingBottom: 24,
  },
  feedSelector: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    backgroundColor: '#020512',
  },
  feedTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  activeFeedTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#00d2ff',
  },
  feedTabText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  activeFeedTabText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: '#1d68ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 20,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
});
