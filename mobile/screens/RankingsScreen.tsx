import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { TopMediaHouse, TopJournalist, Article, User, MediaHouse } from '../types';
import { api } from '../services/api';
import { MediaHouseDetailModal } from '../components/MediaHouseDetailModal';
import { AppIcon, AppIconName } from '../components/AppIcon';

interface RankingsScreenProps {
  onSelectArticle?: (article: Article) => void;
  currentUser?: User | null;
  onOpenAuth?: () => void;
}

export const RankingsScreen: React.FC<RankingsScreenProps> = ({
  onSelectArticle,
  currentUser,
  onOpenAuth,
}) => {
  const [tab, setTab] = useState<'houses' | 'journalists' | 'articles'>('houses');
  const [houses, setHouses] = useState<TopMediaHouse[]>([]);
  const [journalists, setJournalists] = useState<TopJournalist[]>([]);
  const [topArticles, setTopArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormula, setShowFormula] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Media house modal state
  const [selectedHouse, setSelectedHouse] = useState<MediaHouse | null>(null);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [followingLoading, setFollowingLoading] = useState<Record<string, boolean>>({});

  const fetchRankings = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [rankingsData, articlesData] = await Promise.all([
        api.getTopRankings(),
        api.getArticles({ sort: 'views', limit: 20 }),
      ]);

      setHouses(rankingsData.topHouses || []);
      setJournalists(rankingsData.topJournalists || []);
      setTopArticles(articlesData.articles || []);
    } catch (e) {
      console.warn('Erreur classements:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [currentUser?.id]);

  const handleToggleFollow = async (id: string, type: 'house' | 'journalist') => {
    if (!currentUser && onOpenAuth) {
      onOpenAuth();
      return;
    }

    setFollowingLoading((prev) => ({ ...prev, [id]: true }));

    try {
      if (type === 'house') {
        const res = await api.followMediaHouse(id);
        setHouses((prev) =>
          prev.map((h) =>
            h.id === id
              ? { ...h, isFollowing: res.isFollowing, followersCount: res.followersCount }
              : h
          )
        );
      } else {
        const res = await api.followUser(id);
        setJournalists((prev) =>
          prev.map((j) =>
            j.id === id
              ? { ...j, isFollowing: res.isFollowing, followersCount: res.followersCount }
              : j
          )
        );
      }
    } catch (e) {
      console.warn('Erreur follow:', e);
    } finally {
      setFollowingLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleOpenHouse = async (house: TopMediaHouse) => {
    try {
      const res = await api.getMediaHouseById(house.id);
      if (res?.house) {
        setSelectedHouse(res.house);
        setShowHouseModal(true);
      } else {
        setSelectedHouse(house as any);
        setShowHouseModal(true);
      }
    } catch {
      setSelectedHouse(house as any);
      setShowHouseModal(true);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', text: '1er', icon: 'trophy' as AppIconName };
    if (rank === 2) return { color: '#cbd5e1', bg: 'rgba(203, 213, 225, 0.15)', text: '2e', icon: 'medal' as AppIconName };
    if (rank === 3) return { color: '#d97706', bg: 'rgba(217, 119, 6, 0.15)', text: '3e', icon: 'medal' as AppIconName };
    return { color: '#00d2ff', bg: 'rgba(0, 210, 255, 0.1)', text: `#${rank}`, icon: undefined };
  };

  const filteredHouses = houses.filter((h) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      ((h as any).bio ? (h as any).bio.toLowerCase().includes(q) : false) ||
      ((h as any).specialties ? (h as any).specialties.some((s: string) => s.toLowerCase().includes(q)) : false)
    );
  });

  const filteredJournalists = journalists.filter((j) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      j.name.toLowerCase().includes(q) ||
      ((j as any).mediaName ? (j as any).mediaName.toLowerCase().includes(q) : false) ||
      ((j as any).bio ? (j as any).bio.toLowerCase().includes(q) : false)
    );
  });

  const filteredArticles = topArticles.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.authorName?.toLowerCase().includes(q) ||
      a.mediaName?.toLowerCase().includes(q) ||
      a.categoryName?.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* 3 Onglets comme sur le Web */}
      <View style={styles.tabsHeader}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'houses' && styles.activeTabBtn]}
          onPress={() => setTab('houses')}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppIcon
              name="building"
              size={13}
              color={tab === 'houses' ? '#00d2ff' : '#64748b'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, tab === 'houses' && styles.activeTabText]}>
              Rédactions
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tab === 'journalists' && styles.activeTabBtn]}
          onPress={() => setTab('journalists')}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppIcon
              name="pencil"
              size={13}
              color={tab === 'journalists' ? '#00d2ff' : '#64748b'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, tab === 'journalists' && styles.activeTabText]}>
              Journalistes
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tab === 'articles' && styles.activeTabBtn]}
          onPress={() => setTab('articles')}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppIcon
              name="newspaper"
              size={13}
              color={tab === 'articles' ? '#00d2ff' : '#64748b'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, tab === 'articles' && styles.activeTabText]}>
              Enquêtes
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Barre de Recherche rapide dans le classement */}
      <View style={styles.searchBarWrapper}>
        <AppIcon name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={
            tab === 'houses'
              ? 'Filtrer les maisons de presse...'
              : tab === 'journalists'
              ? 'Filtrer les journalistes...'
              : 'Filtrer les meilleures enquêtes...'
          }
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <AppIcon name="close" size={16} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00d2ff" />
          <Text style={styles.loadingText}>Calcul des indices de notoriété en temps réel...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRankings(true)}
              tintColor="#00d2ff"
              colors={['#00d2ff']}
            />
          }
        >
          {/* Bannière Déontologique & Notoriété */}
          <TouchableOpacity
            style={styles.banner}
            onPress={() => setShowFormula(!showFormula)}
            activeOpacity={0.85}
          >
            <View style={styles.bannerTopRow}>
              <Text style={styles.bannerTitle}>
                {tab === 'houses'
                  ? 'LE TOP DES MAISONS DE PRESSE'
                  : tab === 'journalists'
                  ? 'LE TOP DES PLUMES D’ÉLITE'
                  : 'LES ENQUÊTES LES PLUS LUES & FIABLES'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {!showFormula && <AppIcon name="shield" size={11} color="#00d2ff" style={{ marginRight: 4 }} />}
                <Text style={styles.infoPill}>{showFormula ? '▲ Masquer' : 'Formule'}</Text>
              </View>
            </View>
            <Text style={styles.bannerSubtitle}>
              Indexé sur la rigueur journalistique, l'impact des révélations et la confiance citoyenne.
            </Text>
            {showFormula && (
              <View style={styles.formulaBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <AppIcon name="chart" size={12} color="#00d2ff" style={{ marginRight: 4 }} />
                  <Text style={styles.formulaText}>
                    <Text style={{ color: '#00d2ff', fontWeight: 'bold' }}>Indice = </Text>
                    (Audience vérifiée × 0.4) + (Score Déontologique × 0.4) + (Fidélité des Abonnés × 0.2)
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Onglet 1 : Maisons de Presse */}
          {tab === 'houses' && (
            filteredHouses.length === 0 ? (
              <Text style={styles.emptyText}>Aucune maison trouvée pour cette recherche.</Text>
            ) : (
              <>
                {/* Podium Top 3 si pas de recherche filtrée */}
                {!searchQuery.trim() && filteredHouses.length >= 3 && (
                  <View style={styles.podiumContainer}>
                    {/* 2ème Place (Argent) */}
                    <TouchableOpacity
                      style={[styles.podiumCol, styles.podiumCol2]}
                      onPress={() => handleOpenHouse(filteredHouses[1])}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.podiumAvatarWrap, { borderColor: '#cbd5e1' }]}>
                        <Image
                          source={{
                            uri:
                              filteredHouses[1].logo ||
                              'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200&auto=format&fit=crop&q=80',
                          }}
                          style={styles.podiumAvatar}
                        />
                        <View style={[styles.podiumBadgePill, { backgroundColor: '#cbd5e1', flexDirection: 'row', alignItems: 'center' }]}>
                          <AppIcon name="medal" size={11} color="#1e293b" style={{ marginRight: 2 }} />
                          <Text style={styles.podiumBadgeText}>2e</Text>
                        </View>
                      </View>
                      <Text style={styles.podiumName} numberOfLines={1}>
                        {filteredHouses[1].name}
                      </Text>
                      <Text style={styles.podiumScore}>{filteredHouses[1].followersCount || 0} abonnés</Text>
                      <View style={[styles.podiumBase, styles.podiumBase2]}>
                        <Text style={styles.podiumBaseNum}>2</Text>
                      </View>
                    </TouchableOpacity>

                    {/* 1ère Place (Or) */}
                    <TouchableOpacity
                      style={[styles.podiumCol, styles.podiumCol1]}
                      onPress={() => handleOpenHouse(filteredHouses[0])}
                      activeOpacity={0.8}
                    >
                      <AppIcon name="crown" size={20} color="#eab308" style={{ marginBottom: 4 }} />
                      <View style={[styles.podiumAvatarWrap, styles.podiumAvatarWrap1, { borderColor: '#eab308' }]}>
                        <Image
                          source={{
                            uri:
                              filteredHouses[0].logo ||
                              'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200&auto=format&fit=crop&q=80',
                          }}
                          style={styles.podiumAvatar1}
                        />
                        <View style={[styles.podiumBadgePill, { backgroundColor: '#eab308', flexDirection: 'row', alignItems: 'center' }]}>
                          <AppIcon name="trophy" size={11} color="#000" style={{ marginRight: 2 }} />
                          <Text style={[styles.podiumBadgeText, { color: '#000' }]}>1er</Text>
                        </View>
                      </View>
                      <Text style={styles.podiumName1} numberOfLines={1}>
                        {filteredHouses[0].name}
                      </Text>
                      <Text style={styles.podiumScore1}>{filteredHouses[0].followersCount || 0} abonnés</Text>
                      <View style={[styles.podiumBase, styles.podiumBase1]}>
                        <Text style={styles.podiumBaseNum1}>1</Text>
                      </View>
                    </TouchableOpacity>

                    {/* 3ème Place (Bronze) */}
                    <TouchableOpacity
                      style={[styles.podiumCol, styles.podiumCol3]}
                      onPress={() => handleOpenHouse(filteredHouses[2])}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.podiumAvatarWrap, { borderColor: '#d97706' }]}>
                        <Image
                          source={{
                            uri:
                              filteredHouses[2].logo ||
                              'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200&auto=format&fit=crop&q=80',
                          }}
                          style={styles.podiumAvatar}
                        />
                        <View style={[styles.podiumBadgePill, { backgroundColor: '#d97706', flexDirection: 'row', alignItems: 'center' }]}>
                          <AppIcon name="medal" size={11} color="#ffffff" style={{ marginRight: 2 }} />
                          <Text style={styles.podiumBadgeText}>3e</Text>
                        </View>
                      </View>
                      <Text style={styles.podiumName} numberOfLines={1}>
                        {filteredHouses[2].name}
                      </Text>
                      <Text style={styles.podiumScore}>{filteredHouses[2].followersCount || 0} abonnés</Text>
                      <View style={[styles.podiumBase, styles.podiumBase3]}>
                        <Text style={styles.podiumBaseNum}>3</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {!searchQuery.trim() && filteredHouses.length >= 4 && (
                  <View style={styles.sectionDividerRow}>
                    <Text style={styles.sectionDividerText}>AUTRES RÉDACTIONS CLASSÉES</Text>
                  </View>
                )}

                {(searchQuery.trim() || filteredHouses.length < 3
                  ? filteredHouses
                  : filteredHouses.slice(3)
                ).map((house, idx) => {
                  const rank = searchQuery.trim() || filteredHouses.length < 3 ? idx + 1 : idx + 4;
                  const badge = getRankBadge(rank);
                  const isFollowing = Boolean(house.isFollowing);

                  return (
                    <TouchableOpacity
                      key={house.id || idx}
                      style={styles.rankCard}
                      onPress={() => handleOpenHouse(house)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.rankIndicator, { borderColor: badge.color, backgroundColor: badge.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
                        {badge.icon && <AppIcon name={badge.icon} size={10} color={badge.color} style={{ marginRight: 2 }} />}
                        <Text style={[styles.rankText, { color: badge.color }]}>{badge.text}</Text>
                      </View>

                      <Image
                        source={{
                          uri:
                            house.logo ||
                            'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200&auto=format&fit=crop&q=80',
                        }}
                        style={styles.houseLogo}
                      />

                      <View style={styles.infoWrapper}>
                        <View style={styles.titleRow}>
                          <Text style={styles.name} numberOfLines={1}>{house.name}</Text>
                          {house.isVerified && (
                            <AppIcon name="checkmark-circle" size={12} color="#00d2ff" style={{ marginLeft: 4 }} />
                          )}
                        </View>
                        {house.bio ? (
                          <Text style={styles.bio} numberOfLines={2}>
                            {house.bio}
                          </Text>
                        ) : null}

                        <View style={styles.metricsRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                            <AppIcon name="newspaper" size={11} color="#64748b" style={{ marginRight: 4 }} />
                            <Text style={styles.metric}>{house.articlesCount || 0} dépêches</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <AppIcon name="people" size={11} color="#64748b" style={{ marginRight: 4 }} />
                            <Text style={styles.metric}>{house.followersCount || 0} abonnés</Text>
                          </View>
                        </View>
                      </View>

                      {/* Bouton S'abonner */}
                      <TouchableOpacity
                        style={[styles.followBtn, isFollowing && styles.followingBtn]}
                        onPress={() => handleToggleFollow(house.id, 'house')}
                        disabled={followingLoading[house.id]}
                        activeOpacity={0.7}
                      >
                        {followingLoading[house.id] ? (
                          <ActivityIndicator size="small" color="#00d2ff" />
                        ) : isFollowing ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <AppIcon name="checkmark" size={12} color="#00d2ff" style={{ marginRight: 3 }} />
                            <Text style={[styles.followBtnText, styles.followingBtnText]}>Suivi</Text>
                          </View>
                        ) : (
                          <Text style={styles.followBtnText}>+ Suivre</Text>
                        )}
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </>
            )
          )}

          {/* Onglet 2 : Journalistes */}
          {tab === 'journalists' && (
            filteredJournalists.length === 0 ? (
              <Text style={styles.emptyText}>Aucun journaliste trouvé.</Text>
            ) : (
              <>
                {/* Podium Top 3 Journalistes si pas de recherche */}
                {!searchQuery.trim() && filteredJournalists.length >= 3 && (
                  <View style={styles.podiumContainer}>
                    {/* 2ème Place (Argent) */}
                    <View style={[styles.podiumCol, styles.podiumCol2]}>
                      <View style={[styles.podiumAvatarWrap, { borderColor: '#cbd5e1' }]}>
                        {filteredJournalists[1].avatar ? (
                          <Image source={{ uri: filteredJournalists[1].avatar }} style={styles.podiumAvatar} />
                        ) : (
                          <View style={[styles.podiumAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarInitial}>
                              {filteredJournalists[1].name?.charAt(0).toUpperCase() || 'J'}
                            </Text>
                          </View>
                        )}
                        <View style={[styles.podiumBadgePill, { backgroundColor: '#cbd5e1', flexDirection: 'row', alignItems: 'center' }]}>
                          <AppIcon name="medal" size={11} color="#1e293b" style={{ marginRight: 2 }} />
                          <Text style={styles.podiumBadgeText}>2e</Text>
                        </View>
                      </View>
                      <Text style={styles.podiumName} numberOfLines={1}>
                        {filteredJournalists[1].name}
                      </Text>
                      <Text style={styles.podiumScore}>{filteredJournalists[1].followersCount || 0} abonnés</Text>
                      <View style={[styles.podiumBase, styles.podiumBase2]}>
                        <Text style={styles.podiumBaseNum}>2</Text>
                      </View>
                    </View>

                    {/* 1ère Place (Or) */}
                    <View style={[styles.podiumCol, styles.podiumCol1]}>
                      <AppIcon name="crown" size={20} color="#eab308" style={{ marginBottom: 4 }} />
                      <View style={[styles.podiumAvatarWrap, styles.podiumAvatarWrap1, { borderColor: '#eab308' }]}>
                        {filteredJournalists[0].avatar ? (
                          <Image source={{ uri: filteredJournalists[0].avatar }} style={styles.podiumAvatar1} />
                        ) : (
                          <View style={[styles.podiumAvatar1, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarInitial}>
                              {filteredJournalists[0].name?.charAt(0).toUpperCase() || 'J'}
                            </Text>
                          </View>
                        )}
                        <View style={[styles.podiumBadgePill, { backgroundColor: '#eab308', flexDirection: 'row', alignItems: 'center' }]}>
                          <AppIcon name="trophy" size={11} color="#000" style={{ marginRight: 2 }} />
                          <Text style={[styles.podiumBadgeText, { color: '#000' }]}>1er</Text>
                        </View>
                      </View>
                      <Text style={styles.podiumName1} numberOfLines={1}>
                        {filteredJournalists[0].name}
                      </Text>
                      <Text style={styles.podiumScore1}>{filteredJournalists[0].followersCount || 0} abonnés</Text>
                      <View style={[styles.podiumBase, styles.podiumBase1]}>
                        <Text style={styles.podiumBaseNum1}>1</Text>
                      </View>
                    </View>

                    {/* 3ème Place (Bronze) */}
                    <View style={[styles.podiumCol, styles.podiumCol3]}>
                      <View style={[styles.podiumAvatarWrap, { borderColor: '#d97706' }]}>
                        {filteredJournalists[2].avatar ? (
                          <Image source={{ uri: filteredJournalists[2].avatar }} style={styles.podiumAvatar} />
                        ) : (
                          <View style={[styles.podiumAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarInitial}>
                              {filteredJournalists[2].name?.charAt(0).toUpperCase() || 'J'}
                            </Text>
                          </View>
                        )}
                        <View style={[styles.podiumBadgePill, { backgroundColor: '#d97706', flexDirection: 'row', alignItems: 'center' }]}>
                          <AppIcon name="medal" size={11} color="#ffffff" style={{ marginRight: 2 }} />
                          <Text style={styles.podiumBadgeText}>3e</Text>
                        </View>
                      </View>
                      <Text style={styles.podiumName} numberOfLines={1}>
                        {filteredJournalists[2].name}
                      </Text>
                      <Text style={styles.podiumScore}>{filteredJournalists[2].followersCount || 0} abonnés</Text>
                      <View style={[styles.podiumBase, styles.podiumBase3]}>
                        <Text style={styles.podiumBaseNum}>3</Text>
                      </View>
                    </View>
                  </View>
                )}

                {!searchQuery.trim() && filteredJournalists.length >= 4 && (
                  <View style={styles.sectionDividerRow}>
                    <Text style={styles.sectionDividerText}>AUTRES PLUMES D’ÉLITE</Text>
                  </View>
                )}

                {(searchQuery.trim() || filteredJournalists.length < 3
                  ? filteredJournalists
                  : filteredJournalists.slice(3)
                ).map((j, idx) => {
                  const rank = searchQuery.trim() || filteredJournalists.length < 3 ? idx + 1 : idx + 4;
                  const badge = getRankBadge(rank);
                  const isFollowing = Boolean(j.isFollowing);

                  return (
                    <View key={j.id || idx} style={styles.rankCard}>
                      <View style={[styles.rankIndicator, { borderColor: badge.color, backgroundColor: badge.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
                        {badge.icon && <AppIcon name={badge.icon} size={10} color={badge.color} style={{ marginRight: 2 }} />}
                        <Text style={[styles.rankText, { color: badge.color }]}>{badge.text}</Text>
                      </View>

                      {j.avatar ? (
                        <Image source={{ uri: j.avatar }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarInitial}>
                            {j.name ? j.name.charAt(0).toUpperCase() : 'J'}
                          </Text>
                        </View>
                      )}

                      <View style={styles.infoWrapper}>
                        <View style={styles.titleRow}>
                          <Text style={styles.name} numberOfLines={1}>{j.name}</Text>
                          {j.isVerified && (
                            <AppIcon name="checkmark-circle" size={12} color="#00d2ff" style={{ marginLeft: 4 }} />
                          )}
                        </View>
                        <Text style={styles.mediaTag}>
                          {j.mediaName || (j.role === 'admin' ? 'Direction Éditoriale' : 'Journaliste Accrédité')}
                        </Text>

                        <View style={styles.metricsRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                            <AppIcon name="newspaper" size={11} color="#64748b" style={{ marginRight: 4 }} />
                            <Text style={styles.metric}>{j.articlesCount || 0} articles</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <AppIcon name="people" size={11} color="#64748b" style={{ marginRight: 4 }} />
                            <Text style={styles.metric}>{j.followersCount || 0} abonnés</Text>
                          </View>
                        </View>
                      </View>

                      {/* Bouton Suivre la plume */}
                      {currentUser?.id !== j.id && (
                        <TouchableOpacity
                          style={[styles.followBtn, isFollowing && styles.followingBtn]}
                          onPress={() => handleToggleFollow(j.id, 'journalist')}
                          disabled={followingLoading[j.id]}
                          activeOpacity={0.7}
                        >
                          {followingLoading[j.id] ? (
                            <ActivityIndicator size="small" color="#00d2ff" />
                          ) : isFollowing ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <AppIcon name="checkmark" size={12} color="#00d2ff" style={{ marginRight: 3 }} />
                              <Text style={[styles.followBtnText, styles.followingBtnText]}>Suivi</Text>
                            </View>
                          ) : (
                            <Text style={styles.followBtnText}>+ Suivre</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </>
            )
          )}

          {/* Onglet 3 : Enquêtes Vedettes */}
          {tab === 'articles' && (
            filteredArticles.length === 0 ? (
              <Text style={styles.emptyText}>Aucun article classé trouvé.</Text>
            ) : (
              filteredArticles.map((article, idx) => {
                const rank = idx + 1;
                const badge = getRankBadge(rank);

                return (
                  <TouchableOpacity
                    key={article.id || idx}
                    style={styles.articleRankCard}
                    onPress={() => onSelectArticle && onSelectArticle(article)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.articleRankTop}>
                      <View style={[styles.rankIndicator, { borderColor: badge.color, backgroundColor: badge.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
                        {badge.icon && <AppIcon name={badge.icon} size={10} color={badge.color} style={{ marginRight: 2 }} />}
                        <Text style={[styles.rankText, { color: badge.color }]}>{badge.text}</Text>
                      </View>
                      <View style={styles.catBadge}>
                        <Text style={styles.catBadgeText}>{article.categoryName || 'INVESTIGATION'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' }}>
                        <AppIcon name="eye" size={11} color="#64748b" style={{ marginRight: 4 }} />
                        <Text style={styles.articleViews}>{article.viewsCount || 0} lectures</Text>
                      </View>
                    </View>

                    <View style={styles.articleMainRow}>
                      <Image
                        source={{
                          uri:
                            article.coverImage ||
                            'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&auto=format&fit=crop&q=80',
                        }}
                        style={styles.articleThumbnail}
                      />
                      <View style={styles.articleTextCol}>
                        <Text style={styles.articleTitle} numberOfLines={2}>
                          {article.title}
                        </Text>
                        <Text style={styles.articleMeta} numberOfLines={1}>
                          Par {article.authorName} • {article.mediaName || 'PURGE'}
                        </Text>
                        <View style={styles.articleBottomStats}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                            <AppIcon name="heart" size={11} color="#ef4444" style={{ marginRight: 4 }} />
                            <Text style={styles.articleLikes}>{article.likesCount || 0} soutiens</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <AppIcon name="star" size={11} color="#eab308" style={{ marginRight: 4 }} />
                            <Text style={styles.articleTrust}>{article.trustScore || 98}% fiabilité</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )
          )}
        </ScrollView>
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
  tabsHeader: {
    flexDirection: 'row',
    backgroundColor: '#040818',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.25)',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabBtn: {
    borderBottomWidth: 2,
    borderBottomColor: '#00d2ff',
    backgroundColor: 'rgba(0, 210, 255, 0.08)',
  },
  tabText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#00d2ff',
    fontWeight: '800',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090e24',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: '#64748b',
    fontSize: 12,
  },
  scrollList: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 12,
  },
  banner: {
    backgroundColor: 'rgba(29, 104, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.25)',
    marginBottom: 14,
  },
  bannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bannerTitle: {
    color: '#00d2ff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  infoPill: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  bannerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  formulaBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 210, 255, 0.2)',
  },
  formulaText: {
    color: '#e2e8f0',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'monospace',
  },
  rankCard: {
    backgroundColor: '#0c1228',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.15)',
  },
  rankIndicator: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 10,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '900',
  },
  houseLogo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  avatarInitial: {
    color: '#00d2ff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoWrapper: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  verified: {
    color: '#00d2ff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bio: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  mediaTag: {
    color: '#38bdf8',
    fontSize: 11,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  metric: {
    color: '#64748b',
    fontSize: 10.5,
  },
  followBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    minWidth: 68,
    alignItems: 'center',
  },
  followingBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  followBtnText: {
    color: '#00d2ff',
    fontSize: 11,
    fontWeight: '800',
  },
  followingBtnText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 24,
  },
  articleRankCard: {
    backgroundColor: '#0c1228',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.15)',
  },
  articleRankTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  catBadge: {
    backgroundColor: 'rgba(29, 104, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 'auto',
  },
  catBadgeText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
  },
  articleViews: {
    color: '#94a3b8',
    fontSize: 10.5,
  },
  articleMainRow: {
    flexDirection: 'row',
    gap: 10,
  },
  articleThumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  articleTextCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  articleTitle: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
    lineHeight: 17,
  },
  articleMeta: {
    color: '#64748b',
    fontSize: 10.5,
    marginTop: 2,
  },
  articleBottomStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  articleLikes: {
    color: '#f43f5e',
    fontSize: 10.5,
    fontWeight: '700',
  },
  articleTrust: {
    color: '#eab308',
    fontSize: 10.5,
    fontWeight: '700',
  },
  // Nouveaux styles Podium
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 20,
    paddingTop: 10,
    gap: 8,
  },
  podiumCol: {
    alignItems: 'center',
    width: '31%',
  },
  podiumCol1: {
    zIndex: 10,
  },
  podiumCol2: {},
  podiumCol3: {},
  crownEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  podiumAvatarWrap: {
    borderRadius: 30,
    borderWidth: 2,
    padding: 2,
    position: 'relative',
    alignItems: 'center',
  },
  podiumAvatarWrap1: {
    borderRadius: 36,
    borderWidth: 2.5,
  },
  podiumAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  podiumAvatar1: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  podiumBadgePill: {
    position: 'absolute',
    bottom: -6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  podiumBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000',
  },
  podiumName: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  podiumName1: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 10,
    textAlign: 'center',
  },
  podiumScore: {
    color: '#64748b',
    fontSize: 9.5,
    marginTop: 2,
    marginBottom: 6,
  },
  podiumScore1: {
    color: '#00d2ff',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 6,
  },
  podiumBase: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  podiumBase1: {
    height: 75,
    backgroundColor: 'rgba(234, 179, 8, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.4)',
  },
  podiumBase2: {
    height: 55,
    backgroundColor: 'rgba(203, 213, 225, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.3)',
  },
  podiumBase3: {
    height: 42,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
  podiumBaseNum: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '900',
  },
  podiumBaseNum1: {
    color: '#eab308',
    fontSize: 22,
    fontWeight: '900',
  },
  sectionDividerRow: {
    marginVertical: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionDividerText: {
    color: '#00d2ff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
