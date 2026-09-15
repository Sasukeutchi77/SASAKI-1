import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { MediaHouse, Article, User } from '../types';
import { api } from '../services/api';

interface MediaHouseDetailModalProps {
  visible: boolean;
  house: MediaHouse | null;
  currentUser?: User | null;
  onClose: () => void;
  onSelectArticle?: (article: Article) => void;
  onRequireAuth?: () => void;
}

export const MediaHouseDetailModal: React.FC<MediaHouseDetailModalProps> = ({
  visible,
  house,
  currentUser,
  onClose,
  onSelectArticle,
  onRequireAuth,
}) => {
  const [houseArticles, setHouseArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'articles' | 'charter' | 'team'>('articles');

  useEffect(() => {
    if (house) {
      setIsFollowing(Boolean(house.isFollowing));
      setFollowersCount(house.followersCount || 0);
      loadArticles(house.id);
    }
  }, [house]);

  const loadArticles = async (houseId: string) => {
    setLoadingArticles(true);
    try {
      const res = await api.getArticles({ mediaHouseId: houseId, limit: 15 });
      if (res.articles) {
        setHouseArticles(res.articles);
      }
    } catch (e) {
      console.warn('[MediaHouseDetailModal] Erreur chargement articles de la maison:', e);
    } finally {
      setLoadingArticles(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser) {
      if (onRequireAuth) onRequireAuth();
      else Alert.alert('Connexion requise', 'Connectez-vous pour suivre cette maison de presse.');
      return;
    }

    if (!house) return;

    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowersCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      await api.toggleFollowMediaHouse(house.id);
    } catch (err: any) {
      setIsFollowing(!nextState);
      setFollowersCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
      Alert.alert('Erreur', err.message || 'Impossible de mettre à jour votre abonnement.');
    }
  };

  if (!house) return null;

  const defaultCover =
    'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1000&auto=format&fit=crop&q=80';
  const coverUrl = house.coverImage || defaultCover;
  const logoUrl =
    house.logo ||
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&auto=format&fit=crop&q=80';

  const memberCount = house.members?.length || house.membersCount || 1;
  const maxQuota = 5;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Floating Close Button */}
        <TouchableOpacity style={styles.floatingCloseBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.floatingCloseText}>✕ FERMER</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Banner */}
          <View style={styles.bannerWrapper}>
            <Image source={{ uri: coverUrl }} style={styles.bannerImage} resizeMode="cover" />
            <View style={styles.bannerOverlay} />
          </View>

          {/* House Identity Box */}
          <View style={styles.identityCard}>
            <View style={styles.logoRow}>
              <View style={styles.logoWrapper}>
                <Image source={{ uri: logoUrl }} style={styles.logoImg} resizeMode="cover" />
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.followBtn, isFollowing && styles.followingBtn]}
                  onPress={handleToggleFollow}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                    {isFollowing ? '✓ ABONNÉ' : '+ S’ABONNER'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.titleBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.houseName}>{house.name}</Text>
                {house.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ AGRÉÉE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.houseMotto}>« {house.motto || 'L’information pure et factuelle'} »</Text>
            </View>

            {/* Quota Rédactionnel Strict */}
            <View style={styles.quotaBox}>
              <View style={styles.quotaHeader}>
                <Text style={styles.quotaLabel}>QUOTA DE RÉDACTION ACCRÉDITÉE</Text>
                <Text style={styles.quotaVal}>
                  {memberCount} / {maxQuota} journalistes
                </Text>
              </View>
              <View style={styles.quotaProgressBar}>
                <View
                  style={[
                    styles.quotaProgressFill,
                    { width: `${Math.min(100, (memberCount / maxQuota) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.quotaNote}>
                Règle déontologique : 5 journalistes accrédités max par maison
              </Text>
            </View>

            {/* Key Metrics Dashboard */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricNumber}>{house.trustScore || 98}%</Text>
                <Text style={styles.metricLabel}>Indice de Fiabilité</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricNumber}>{house.articlesCount || houseArticles.length}</Text>
                <Text style={styles.metricLabel}>Enquêtes Publiées</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricNumber}>{followersCount}</Text>
                <Text style={styles.metricLabel}>Citoyens Abonnés</Text>
              </View>
            </View>

            {/* Specialties Chips */}
            {house.specialties && house.specialties.length > 0 && (
              <View style={styles.specialtiesBlock}>
                <Text style={styles.subHeading}>DOMAINES D’INVESTIGATION</Text>
                <View style={styles.chipsRow}>
                  {house.specialties.map((spec, idx) => (
                    <View key={idx} style={styles.specChip}>
                      <Text style={styles.specChipText}>{spec}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Navigation Tabs Inside Modal */}
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.modalTab, activeTab === 'articles' && styles.modalTabActive]}
                onPress={() => setActiveTab('articles')}
              >
                <Text
                  style={[styles.modalTabText, activeTab === 'articles' && styles.modalTabTextActive]}
                >
                  📰 Dépêches ({houseArticles.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTab, activeTab === 'charter' && styles.modalTabActive]}
                onPress={() => setActiveTab('charter')}
              >
                <Text
                  style={[styles.modalTabText, activeTab === 'charter' && styles.modalTabTextActive]}
                >
                  📜 Charte & Bureau
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab: Dépêches */}
            {activeTab === 'articles' && (
              <View style={styles.articlesSection}>
                {loadingArticles ? (
                  <View style={styles.centerBox}>
                    <ActivityIndicator size="small" color="#06b6d4" />
                    <Text style={styles.subText}>Chargement des publications...</Text>
                  </View>
                ) : houseArticles.length === 0 ? (
                  <View style={styles.centerBox}>
                    <Text style={styles.emptyTitle}>Aucune publication enregistrée</Text>
                    <Text style={styles.subText}>
                      Cette maison finalise actuellement ses premières enquêtes exclusives.
                    </Text>
                  </View>
                ) : (
                  houseArticles.map((art) => (
                    <TouchableOpacity
                      key={art.id}
                      style={styles.miniArticleCard}
                      onPress={() => {
                        onClose();
                        if (onSelectArticle) onSelectArticle(art);
                      }}
                      activeOpacity={0.8}
                    >
                      {art.coverImage ? (
                        <Image source={{ uri: art.coverImage }} style={styles.miniArticleImg} />
                      ) : null}
                      <View style={styles.miniArticleInfo}>
                        <View style={styles.miniBadgeRow}>
                          <Text style={styles.miniCategoryText}>
                            {art.categoryName || 'INVESTIGATION'}
                          </Text>
                          <Text style={styles.miniDate}>
                            {new Date(art.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </Text>
                        </View>
                        <Text style={styles.miniTitle} numberOfLines={2}>
                          {art.title}
                        </Text>
                        <Text style={styles.miniAuthor} numberOfLines={1}>
                          Plume : {art.authorName}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Tab: Charte & Coordonnées */}
            {activeTab === 'charter' && (
              <View style={styles.charterSection}>
                <View style={styles.charterCard}>
                  <Text style={styles.charterTitle}>LIGNE ÉDITORIALE & ENGAGEMENT DÉONTOLOGIQUE</Text>
                  <Text style={styles.charterText}>
                    {house.description ||
                      'Cette maison s’engage solennellement sur l’honneur à vérifier et recouper chaque information avant diffusion, dans le respect de l’impartialité la plus stricte.'}
                  </Text>
                </View>

                {/* Coordonnées officielles */}
                <View style={styles.contactCard}>
                  <Text style={styles.contactTitle}>BUREAU & CONTACT OFFICIEL</Text>
                  <View style={styles.contactItem}>
                    <Text style={styles.contactLabel}>Directeur de Rédaction :</Text>
                    <Text style={styles.contactVal}>{house.ownerName || 'Direction Centrale'}</Text>
                  </View>
                  {house.email ? (
                    <View style={styles.contactItem}>
                      <Text style={styles.contactLabel}>Courriel officiel :</Text>
                      <Text style={styles.contactVal}>{house.email}</Text>
                    </View>
                  ) : null}
                  {house.phone ? (
                    <View style={styles.contactItem}>
                      <Text style={styles.contactLabel}>Standard Presse :</Text>
                      <Text style={styles.contactVal}>{house.phone}</Text>
                    </View>
                  ) : null}
                  {house.address ? (
                    <View style={styles.contactItem}>
                      <Text style={styles.contactLabel}>Bureau rédactionnel :</Text>
                      <Text style={styles.contactVal}>{house.address}</Text>
                    </View>
                  ) : null}
                  {house.website ? (
                    <TouchableOpacity
                      style={styles.websiteBtn}
                      onPress={() => Linking.openURL(house.website || '')}
                    >
                      <Text style={styles.websiteBtnText}>🌐 Accéder au portail officiel ›</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020512',
  },
  floatingCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 99,
    backgroundColor: 'rgba(2, 5, 18, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  floatingCloseText: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  bannerWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#0a1026',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 5, 18, 0.45)',
  },
  identityCard: {
    marginTop: -40,
    backgroundColor: '#070d22',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  logoWrapper: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#06b6d4',
    overflow: 'hidden',
    backgroundColor: '#020512',
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  actionRow: {
    paddingBottom: 4,
  },
  followBtn: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
  },
  followingBtn: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  followBtnText: {
    color: '#020512',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  followingBtnText: {
    color: '#06b6d4',
  },
  titleBlock: {
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  houseName: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  houseMotto: {
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  quotaBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  quotaLabel: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  quotaVal: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold',
  },
  quotaProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  quotaProgressFill: {
    height: '100%',
    backgroundColor: '#06b6d4',
  },
  quotaNote: {
    color: '#64748b',
    fontSize: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  metricNumber: {
    color: '#06b6d4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  specialtiesBlock: {
    marginBottom: 16,
  },
  subHeading: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specChip: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  specChipText: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 14,
  },
  modalTab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
  },
  modalTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#06b6d4',
  },
  modalTabText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalTabTextActive: {
    color: '#06b6d4',
  },
  articlesSection: {
    gap: 10,
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subText: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
  },
  miniArticleCard: {
    flexDirection: 'row',
    backgroundColor: '#0a1026',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 10,
    gap: 10,
    alignItems: 'center',
  },
  miniArticleImg: {
    width: 68,
    height: 68,
    borderRadius: 8,
  },
  miniArticleInfo: {
    flex: 1,
  },
  miniBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  miniCategoryText: {
    color: '#06b6d4',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  miniDate: {
    color: '#64748b',
    fontSize: 9,
  },
  miniTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 16,
    marginBottom: 4,
  },
  miniAuthor: {
    color: '#94a3b8',
    fontSize: 10,
  },
  charterSection: {
    gap: 12,
  },
  charterCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    borderRadius: 12,
    padding: 14,
  },
  charterTitle: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  charterText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  contactCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  contactTitle: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  contactLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  contactVal: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '500',
  },
  websiteBtn: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  websiteBtnText: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
