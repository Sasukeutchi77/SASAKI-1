import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Article, Category, Poll, MediaHouse, User } from '../types';
import { api, CURATED_FALLBACK_ARTICLES } from '../services/api';
import { ArticleCard } from '../components/ArticleCard';
import { CategoryPills } from '../components/CategoryPills';
import { MediaHouseDetailModal } from '../components/MediaHouseDetailModal';

interface HomeScreenProps {
  onSelectArticle: (article: Article) => void;
  onRequireAuth?: () => void;
  onOpenNotifications?: () => void;
  onOpenTrustSystem?: () => void;
  currentUser?: User | null;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectArticle,
  onRequireAuth,
  onOpenNotifications,
  onOpenTrustSystem,
  currentUser,
}) => {
  const [articles, setArticles] = useState<Article[]>(CURATED_FALLBACK_ARTICLES);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [feedType, setFeedType] = useState<'foryou' | 'trending' | 'latest' | 'following' | 'houses'>('foryou');
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Maisons de presse & Modale
  const [mediaHouses, setMediaHouses] = useState<MediaHouse[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<MediaHouse | null>(null);
  const [showHouseModal, setShowHouseModal] = useState<boolean>(false);

  // Sondage citoyen interactif du jour
  const [poll, setPoll] = useState<Poll>({
    id: 'poll_season_2026',
    question: 'Sondage Citoyen : Quel clan dominera la prochaine saison de la compétition ?',
    options: [
      { id: 'opt_1', text: 'Le Clan du Nord (Stratégie & Défense)', votesCount: 312 },
      { id: 'opt_2', text: 'Les Ombres Urbaines (Vitesse & Furtivité)', votesCount: 264 },
      { id: 'opt_3', text: 'L’Ordre Écarlate (Puissance d’Assaut)', votesCount: 198 },
    ],
    totalVotes: 774,
  });
  const [userVoted, setUserVoted] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const [catRes, houseRes] = await Promise.all([
        api.getCategories(),
        api.getMediaHouses(),
      ]);
      if (catRes.categories && catRes.categories.length > 0) {
        setCategories(catRes.categories);
      }
      if (houseRes.mediaHouses && houseRes.mediaHouses.length > 0) {
        setMediaHouses(houseRes.mediaHouses);
      }
    } catch (e) {
      console.warn('[HomeScreen] Erreur chargement catégories/maisons:', e);
    }
  };

  const fetchArticles = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else if (articles.length === 0) setLoading(true);
      setError(null);

      try {
        const res = await api.getArticles({
          feed: feedType,
          category: selectedCategoryId || undefined,
          limit: 25,
        });

        if (res.articles && res.articles.length > 0) {
          setArticles(res.articles);
        }
      } catch (err: any) {
        console.warn('[HomeScreen] Erreur chargement articles, conservation des dépêches en cache:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [feedType, selectedCategoryId, articles.length]
  );

  useEffect(() => {
    fetchCategories();
    fetchArticles();
  }, [selectedCategoryId, feedType]);

  const handleToggleLike = async (article: Article) => {
    const wasLiked = Boolean(article.isLiked);
    const newLikesCount = wasLiked ? Math.max(0, article.likesCount - 1) : article.likesCount + 1;

    setArticles((prev) =>
      prev.map((a) =>
        a.id === article.id ? { ...a, isLiked: !wasLiked, likesCount: newLikesCount } : a
      )
    );

    try {
      await api.toggleLikeArticle(article.id);
    } catch {
      // Revert en cas d'échec
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
    } catch {
      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, isBookmarked: wasBookmarked } : a))
      );
      if (onRequireAuth) onRequireAuth();
    }
  };

  const handleVote = (optionId: string) => {
    if (userVoted) return;
    setUserVoted(optionId);
    setPoll((prev) => {
      const updatedOpts = prev.options.map((opt) =>
        opt.id === optionId ? { ...opt, votesCount: opt.votesCount + 1 } : opt
      );
      return {
        ...prev,
        options: updatedOpts,
        totalVotes: prev.totalVotes + 1,
        userVotedOptionId: optionId,
      };
    });
  };

  // Article à la Une (Premier article du flux sélectionné)
  const heroArticle = articles.length > 0 ? articles[0] : null;
  const feedArticles = articles.length > 1 ? articles.slice(1) : [];

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* 1. Bandeau Flash Info Direct */}
      <TouchableOpacity
        style={styles.flashBar}
        activeOpacity={0.85}
        onPress={onOpenNotifications}
      >
        <View style={styles.flashBadge}>
          <View style={styles.flashPulseDot} />
          <Text style={styles.flashBadgeText}>FLASH DIRECT</Text>
        </View>
        <Text style={styles.flashText} numberOfLines={1}>
          Décret officiel n°44 : Règles Sanctuaires et Délimitation des Arènes
        </Text>
        <Text style={styles.flashArrow}>›</Text>
      </TouchableOpacity>

      {/* 2. Article Vedette / Hero "À LA UNE" */}
      {heroArticle && (
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => onSelectArticle(heroArticle)}
          activeOpacity={0.9}
        >
          <Image
            source={{
              uri:
                heroArticle.coverImage ||
                'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=900&auto=format&fit=crop&q=80',
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroCategoryBadge}>
                <Text style={styles.heroCategoryText}>
                  {heroArticle.categoryName || 'ENQUÊTE EXCLUSIVE'}
                </Text>
              </View>
              <View style={styles.trustScoreBadge}>
                <Text style={styles.trustScoreText}>⭐ 98% FIABILITÉ</Text>
              </View>
            </View>

            <Text style={styles.heroTitle} numberOfLines={2}>
              {heroArticle.title}
            </Text>
            <Text style={styles.heroSummary} numberOfLines={2}>
              {heroArticle.summary}
            </Text>

            <View style={styles.heroAuthorRow}>
              <Image
                source={{
                  uri:
                    heroArticle.authorAvatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                }}
                style={styles.heroAuthorAvatar}
              />
              <View style={styles.heroAuthorInfo}>
                <Text style={styles.heroAuthorName}>
                  {heroArticle.authorName} <Text style={styles.verifiedCheck}>✓</Text>
                </Text>
                <Text style={styles.heroMediaName}>
                  {heroArticle.mediaName || 'PURGE RÉDACTION CENTRALE'}
                </Text>
              </View>
              <Text style={styles.heroReadTime}>⏱ {heroArticle.readTime || 4} min</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* 3. Sélecteur d'onglets de flux */}
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
            Dépêches ⏱
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.feedTab, feedType === 'following' && styles.activeFeedTab]}
          onPress={() => {
            if (!currentUser && onRequireAuth) {
              onRequireAuth();
            } else {
              setFeedType('following');
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.feedTabText, feedType === 'following' && styles.activeFeedTabText]}>
            Abonnements 👥
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.feedTab, feedType === 'houses' && styles.activeFeedTab]}
          onPress={() => setFeedType('houses')}
          activeOpacity={0.7}
        >
          <Text style={[styles.feedTabText, feedType === 'houses' && styles.activeFeedTabText]}>
            Maisons 🏛️
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. Barre horizontale des 6 Catégories Officielles */}
      <CategoryPills
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      {/* 5. Carte Système de Confiance (Parité avec la version Web) */}
      <View style={styles.trustCard}>
        <View style={styles.trustCardHeader}>
          <View style={styles.trustShieldIconBox}>
            <Text style={styles.trustShieldEmoji}>🛡️</Text>
          </View>
          <View style={styles.trustTitleCol}>
            <Text style={styles.trustTitle}>SYSTÈME DE CONFIANCE & DÉONTOLOGIE</Text>
            <Text style={styles.trustSubtitle}>3 Niveaux de Vérification Certifiée</Text>
          </View>
          {onOpenTrustSystem && (
            <TouchableOpacity
              style={styles.trustDiscoverBtn}
              onPress={onOpenTrustSystem}
              activeOpacity={0.8}
            >
              <Text style={styles.trustDiscoverBtnText}>Découvrir ›</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.trustDesc}>
          Toutes les publications sont signées, sourcées et rédigées par des journalistes et rédactions accrédités.
        </Text>

        <View style={styles.trustLevelsRow}>
          <View style={styles.trustLevelPill}>
            <Text style={styles.trustLevelNum}>Niv. 1</Text>
            <Text style={styles.trustLevelLabel}>Journaliste</Text>
          </View>
          <View style={[styles.trustLevelPill, styles.trustLevelPillGreen]}>
            <Text style={[styles.trustLevelNum, styles.trustLevelNumGreen]}>Niv. 2</Text>
            <Text style={styles.trustLevelLabel}>Maison Presse</Text>
          </View>
          <View style={[styles.trustLevelPill, styles.trustLevelPillGold]}>
            <Text style={[styles.trustLevelNum, styles.trustLevelNumGold]}>Niv. 3</Text>
            <Text style={styles.trustLevelLabel}>Article Factuel</Text>
          </View>
        </View>
      </View>

      {/* 5. Sondage Citoyen du Jour Interactif */}
      <View style={styles.pollCard}>
        <View style={styles.pollHeader}>
          <Text style={styles.pollBadge}>SONDAGE CITOYEN EN COURS</Text>
          <Text style={styles.pollVotesCount}>{poll.totalVotes} votes</Text>
        </View>
        <Text style={styles.pollQuestion}>{poll.question}</Text>

        <View style={styles.pollOptionsContainer}>
          {poll.options.map((opt) => {
            const percentage =
              poll.totalVotes > 0 ? Math.round((opt.votesCount / poll.totalVotes) * 100) : 0;
            const isSelected = userVoted === opt.id;

            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.pollOptionBtn, isSelected && styles.pollOptionBtnSelected]}
                onPress={() => handleVote(opt.id)}
                disabled={Boolean(userVoted)}
                activeOpacity={0.8}
              >
                {/* Barre de progression en arrière-plan */}
                <View style={[styles.pollProgressFill, { width: `${percentage}%` }]} />
                <View style={styles.pollOptionContent}>
                  <Text style={[styles.pollOptionText, isSelected && styles.pollOptionTextSelected]}>
                    {opt.text}
                  </Text>
                  <Text style={styles.pollOptionPercent}>{percentage}%</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {userVoted && (
          <Text style={styles.votedNotice}>✓ Votre suffrage citoyen a bien été pris en compte.</Text>
        )}
      </View>

      {/* Titre section du fil */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>DERNIÈRES DÉPÊCHES VÉRIFIÉES</Text>
        <Text style={styles.sectionCount}>{articles.length} articles</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && articles.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#06b6d4" />
          <Text style={styles.loadingText}>Chargement des dépêches en direct...</Text>
        </View>
      ) : feedType === 'houses' ? (
        <FlatList
          data={mediaHouses}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.houseFeedCard}
              onPress={() => {
                setSelectedHouse(item);
                setShowHouseModal(true);
              }}
              activeOpacity={0.85}
            >
              {item.coverImage && (
                <Image source={{ uri: item.coverImage }} style={styles.houseFeedCover} />
              )}
              <View style={styles.houseFeedBody}>
                <View style={styles.houseFeedHeader}>
                  <Image
                    source={{
                      uri:
                        item.logo ||
                        'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
                    }}
                    style={styles.houseFeedLogo}
                  />
                  <View style={styles.houseFeedTitleCol}>
                    <Text style={styles.houseFeedName}>{item.name}</Text>
                    <Text style={styles.houseFeedMotto}>« {item.motto || 'Information Indépendante'} »</Text>
                  </View>
                </View>
                <Text style={styles.houseFeedDesc} numberOfLines={2}>
                  {item.description || 'Rédaction engagée sur la vérité et l’investigation critique.'}
                </Text>
                <View style={styles.houseFeedStatsRow}>
                  <Text style={styles.houseFeedStatItem}>📰 {item.articlesCount || 0} enquêtes</Text>
                  <Text style={styles.houseFeedStatItem}>👥 {item.followersCount || 0} abonnés</Text>
                  <Text style={styles.houseFeedStatScore}>⭐ {item.trustScore || 95}% confiance</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={feedArticles}
          keyExtractor={(item: Article) => item.id}
          renderItem={({ item }: { item: Article }) => (
            <ArticleCard
              article={item}
              onPress={() => onSelectArticle(item)}
              onToggleLike={() => handleToggleLike(item)}
              onToggleBookmark={() => handleToggleBookmark(item)}
              onPressHouse={(houseName, houseId) => {
                const match = mediaHouses.find((h) => h.id === houseId || h.name.toLowerCase() === houseName.toLowerCase());
                if (match) {
                  setSelectedHouse(match);
                  setShowHouseModal(true);
                } else if (houseId) {
                  api.getMediaHouseById(houseId).then((res) => {
                    if (res?.house) {
                      setSelectedHouse(res.house);
                      setShowHouseModal(true);
                    }
                  });
                }
              }}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            articles.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Aucune publication</Text>
                <Text style={styles.emptySub}>
                  Aucun article ne correspond à cette sélection pour l'instant.
                </Text>
              </View>
            ) : undefined
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchArticles(true)}
              tintColor="#06b6d4"
              colors={['#06b6d4']}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal Détails Maison de Presse */}
      <MediaHouseDetailModal
        visible={showHouseModal}
        house={selectedHouse}
        currentUser={currentUser}
        onClose={() => setShowHouseModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020512',
  },
  listContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingBottom: 6,
  },
  flashBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderBottomWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  flashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  flashPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    marginRight: 5,
  },
  flashBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  flashText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  flashArrow: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    backgroundColor: '#070d1e',
  },
  heroImage: {
    width: '100%',
    height: 210,
  },
  heroOverlay: {
    padding: 16,
    backgroundColor: '#070d1e',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroCategoryBadge: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  heroCategoryText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  trustScoreBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    borderWidth: 0.8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trustScoreText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  heroTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    marginBottom: 6,
  },
  heroSummary: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  heroAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  heroAuthorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  heroAuthorInfo: {
    flex: 1,
  },
  heroAuthorName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  verifiedCheck: {
    color: '#06b6d4',
    fontSize: 12,
  },
  heroMediaName: {
    color: '#64748b',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroReadTime: {
    color: '#94a3b8',
    fontSize: 11,
  },
  feedSelector: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  feedTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeFeedTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#06b6d4',
  },
  feedTabText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  activeFeedTabText: {
    color: '#06b6d4',
    fontWeight: '800',
  },
  trustCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  trustCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trustShieldIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  trustShieldEmoji: {
    fontSize: 16,
  },
  trustTitleCol: {
    flex: 1,
  },
  trustTitle: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  trustSubtitle: {
    color: '#00d2ff',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  trustDiscoverBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  trustDiscoverBtnText: {
    color: '#00d2ff',
    fontSize: 10,
    fontWeight: '800',
  },
  trustDesc: {
    color: '#94a3b8',
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 10,
  },
  trustLevelsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trustLevelPill: {
    flex: 1,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  trustLevelPillGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  trustLevelPillGold: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.25)',
  },
  trustLevelNum: {
    color: '#00d2ff',
    fontSize: 10,
    fontWeight: '900',
  },
  trustLevelNumGreen: {
    color: '#10b981',
  },
  trustLevelNumGold: {
    color: '#eab308',
  },
  trustLevelLabel: {
    color: '#94a3b8',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 1,
  },
  pollCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    backgroundColor: '#091024',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pollBadge: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pollVotesCount: {
    color: '#64748b',
    fontSize: 11,
  },
  pollQuestion: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 20,
  },
  pollOptionsContainer: {
    gap: 8,
  },
  pollOptionBtn: {
    height: 44,
    backgroundColor: '#020512',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  pollOptionBtnSelected: {
    borderColor: '#06b6d4',
  },
  pollProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
  },
  pollOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  pollOptionText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  pollOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  pollOptionPercent: {
    color: '#06b6d4',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
  },
  votedNotice: {
    color: '#10b981',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionCount: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '700',
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
  houseFeedCard: {
    backgroundColor: '#081028',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    overflow: 'hidden',
  },
  houseFeedCover: {
    width: '100%',
    height: 110,
  },
  houseFeedBody: {
    padding: 14,
  },
  houseFeedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  houseFeedLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#06b6d4',
    marginRight: 10,
  },
  houseFeedTitleCol: {
    flex: 1,
  },
  houseFeedName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  houseFeedMotto: {
    color: '#64748b',
    fontSize: 11,
    fontStyle: 'italic',
  },
  houseFeedDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  houseFeedStatsRow: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  houseFeedStatItem: {
    color: '#94a3b8',
    fontSize: 11,
  },
  houseFeedStatScore: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
