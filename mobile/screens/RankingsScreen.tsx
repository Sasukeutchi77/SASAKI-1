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
} from 'react-native';
import { TopMediaHouse, TopJournalist } from '../types';
import { api } from '../services/api';

export const RankingsScreen: React.FC = () => {
  const [tab, setTab] = useState<'houses' | 'journalists'>('houses');
  const [houses, setHouses] = useState<TopMediaHouse[]>([]);
  const [journalists, setJournalists] = useState<TopJournalist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRankings = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.getTopRankings();
      setHouses(data.topHouses || []);
      setJournalists(data.topJournalists || []);
    } catch (e) {
      console.warn('Erreur classements:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { color: '#eab308', text: '🥇 1er' };
    if (rank === 2) return { color: '#94a3b8', text: '🥈 2e' };
    if (rank === 3) return { color: '#b45309', text: '🥉 3e' };
    return { color: '#00d2ff', text: `#${rank}` };
  };

  return (
    <View style={styles.container}>
      {/* Sélecteur d'onglet */}
      <View style={styles.tabsHeader}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'houses' && styles.activeTabBtn]}
          onPress={() => setTab('houses')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, tab === 'houses' && styles.activeTabText]}>
            🏛 Maisons de Presse
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tab === 'journalists' && styles.activeTabBtn]}
          onPress={() => setTab('journalists')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, tab === 'journalists' && styles.activeTabText]}>
            🖋 Top Journalistes
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00d2ff" />
          <Text style={styles.loadingText}>Calcul des indices de réputation...</Text>
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
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>
              {tab === 'houses' ? 'LE TOP 7 DES MAISONS' : 'LE TOP 7 DES PLUMES'}
            </Text>
            <Text style={styles.bannerSubtitle}>
              Indice calculé sur la rigueur journalistique, l'impact des enquêtes et la confiance citoyenne.
            </Text>
          </View>

          {tab === 'houses' ? (
            houses.length === 0 ? (
              <Text style={styles.emptyText}>Aucune maison répertoriée pour le moment.</Text>
            ) : (
              houses.map((house, idx) => {
                const badge = getRankBadge(house.rank || idx + 1);
                return (
                  <View key={house.id || idx} style={styles.rankCard}>
                    <View style={[styles.rankIndicator, { borderColor: badge.color }]}>
                      <Text style={[styles.rankText, { color: badge.color }]}>{badge.text}</Text>
                    </View>

                    <View style={styles.infoWrapper}>
                      <View style={styles.titleRow}>
                        <Text style={styles.name}>{house.name}</Text>
                        {house.isVerified && <Text style={styles.verified}> ✓</Text>}
                      </View>
                      {house.bio ? (
                        <Text style={styles.bio} numberOfLines={2}>
                          {house.bio}
                        </Text>
                      ) : null}

                      <View style={styles.metricsRow}>
                        <Text style={styles.metric}>
                          📰 {house.articlesCount || 0} enquêtes
                        </Text>
                        <Text style={styles.metric}>
                          👥 {house.followersCount || 0} abonnés
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )
          ) : journalists.length === 0 ? (
            <Text style={styles.emptyText}>Aucun journaliste classé pour le moment.</Text>
          ) : (
            journalists.map((j, idx) => {
              const badge = getRankBadge(j.rank || idx + 1);
              return (
                <View key={j.id || idx} style={styles.rankCard}>
                  <View style={[styles.rankIndicator, { borderColor: badge.color }]}>
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
                      <Text style={styles.name}>{j.name}</Text>
                      {j.isVerified && <Text style={styles.verified}> ✓</Text>}
                    </View>
                    <Text style={styles.mediaTag}>
                      {j.mediaName || 'Journaliste Indépendant'}
                    </Text>

                    <View style={styles.metricsRow}>
                      <Text style={styles.metric}>
                        📰 {j.articlesCount || 0} articles
                      </Text>
                      <Text style={styles.metric}>
                        👥 {j.followersCount || 0} lecteurs
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
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
    backgroundColor: '#020512',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTabBtn: {
    borderBottomWidth: 2,
    borderBottomColor: '#00d2ff',
  },
  tabText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  scrollList: {
    padding: 16,
    paddingBottom: 32,
  },
  banner: {
    backgroundColor: 'rgba(29, 104, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.25)',
    marginBottom: 16,
  },
  bannerTitle: {
    color: '#00d2ff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
  },
  rankCard: {
    backgroundColor: '#0c1228',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  rankIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 12,
    minWidth: 44,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '900',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    color: '#00d2ff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoWrapper: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  verified: {
    color: '#00d2ff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bio: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  mediaTag: {
    color: '#00d2ff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  metric: {
    color: '#64748b',
    fontSize: 11,
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
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 32,
    fontStyle: 'italic',
  },
});
