import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { User, MediaHouse, Article, isJournalistRole, isAdminRole } from '../types';
import { api } from '../services/api';

interface JournalistHouseSectionProps {
  currentUser: User;
  onOpenCreateArticleForHouse: (houseId?: string, houseName?: string) => void;
  onOpenHouseModal?: (house: MediaHouse) => void;
  onSelectArticle?: (article: Article) => void;
  onCreateHouse: () => void;
  onUserUpdated?: (user: User) => void;
}

export const JournalistHouseSection: React.FC<JournalistHouseSectionProps> = ({
  currentUser,
  onOpenCreateArticleForHouse,
  onOpenHouseModal,
  onSelectArticle,
  onCreateHouse,
  onUserUpdated,
}) => {
  const [house, setHouse] = useState<MediaHouse | null>(null);
  const [loadingHouse, setLoadingHouse] = useState<boolean>(true);
  const [houseArticles, setHouseArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'articles' | 'stats' | 'team'>('articles');

  const isJournalist = isJournalistRole(currentUser.role);
  const isAdmin = isAdminRole(currentUser.role);

  useEffect(() => {
    loadUserHouse();
  }, [currentUser.id, currentUser.mediaId, currentUser.mediaName]);

  const loadUserHouse = async () => {
    setLoadingHouse(true);
    try {
      const res = await api.getMediaHouses();
      const allHouses = res.mediaHouses || [];

      // Trouver la maison de l'utilisateur (par mediaId, nom ou ownerId ou member)
      let found = allHouses.find(
        (h) =>
          (currentUser.mediaId && h.id === currentUser.mediaId) ||
          (currentUser.mediaName && h.name.toLowerCase() === currentUser.mediaName.toLowerCase()) ||
          h.ownerId === currentUser.id ||
          (h.members && h.members.includes(currentUser.id))
      );

      if (found) {
        setHouse(found);
        loadHouseArticles(found.id, found.name);
      } else if (currentUser.mediaName) {
        // Maison virtuelle si affilié mais pas encore dans le top
        const virtualHouse: MediaHouse = {
          id: currentUser.mediaId || `house_${currentUser.id}`,
          name: currentUser.mediaName,
          slug: currentUser.mediaName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          logo: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=300&auto=format&fit=crop&q=80',
          coverImage: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
          description: 'Maison de presse fondée et animée par la rédaction.',
          motto: 'L’information vérifiée et sans compromis.',
          specialties: ['Investigation', 'Société & Citoyenneté'],
          ownerId: currentUser.id,
          ownerName: currentUser.name,
          members: [currentUser.id],
          followersCount: currentUser.followersCount || 12,
          articlesCount: currentUser.articlesCount || 0,
          isVerified: true,
          trustScore: 96,
          createdAt: new Date().toISOString(),
        };
        setHouse(virtualHouse);
        loadHouseArticles(virtualHouse.id, virtualHouse.name);
      } else {
        setHouse(null);
      }
    } catch (err) {
      console.warn('[JournalistHouseSection] Erreur chargement maison:', err);
    } finally {
      setLoadingHouse(false);
    }
  };

  const loadHouseArticles = async (houseId: string, houseName?: string) => {
    setLoadingArticles(true);
    try {
      const res = await api.getArticles({ mediaHouseId: houseId, limit: 12 });
      let articles = res.articles || [];

      // Si pas d'articles par mediaHouseId, filtrer également par mediaName ou authorId
      if (articles.length === 0 && houseName) {
        const allRes = await api.getArticles({ limit: 40 });
        articles = (allRes.articles || []).filter(
          (a) =>
            a.mediaId === houseId ||
            (a.mediaName && a.mediaName.toLowerCase() === houseName.toLowerCase()) ||
            a.authorId === currentUser.id
        );
      }

      setHouseArticles(articles);
    } catch (err) {
      console.warn('[JournalistHouseSection] Erreur chargement articles maison:', err);
    } finally {
      setLoadingArticles(false);
    }
  };

  // Calcul métriques totales
  const totalViews = houseArticles.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
  const totalLikes = houseArticles.reduce((sum, a) => sum + (a.likesCount || 0), 0);
  const totalComments = houseArticles.reduce((sum, a) => sum + (a.commentsCount || 0), 0);

  // Si pas journaliste ni admin
  if (!isJournalist && !isAdmin) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>🏛️ MAISON DE PRESSE</Text>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>RÉSERVÉ JOURNALISTES</Text>
          </View>
        </View>
        <Text style={styles.subText}>
          Les maisons de presse permettent aux journalistes d’investigation de publier sous une marque éditoriale reconnue et certifiée.
        </Text>
      </View>
    );
  }

  if (loadingHouse) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#00d2ff" style={{ marginVertical: 20 }} />
        <Text style={styles.loadingText}>Chargement de votre espace rédaction...</Text>
      </View>
    );
  }

  // Si le journaliste n'a pas encore de maison
  if (!house) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>🏛️ VOTRE MAISON DE PRESSE</Text>
            <Text style={styles.subTitle}>Organe de presse officiel</Text>
          </View>
          <View style={styles.unregisteredBadge}>
            <Text style={styles.unregisteredBadgeText}>NON FONDÉE</Text>
          </View>
        </View>

        <Text style={styles.emptyDesc}>
          En tant que journaliste accrédité, vous avez le pouvoir de fonder votre propre maison de presse, d'inviter des confrères et de publier toutes vos enquêtes sous une même autorité déontologique.
        </Text>

        <TouchableOpacity
          style={styles.createHouseBtn}
          onPress={onCreateHouse}
          activeOpacity={0.8}
        >
          <Text style={styles.createHouseBtnText}>🏛️ FONDER MA MAISON DE PRESSE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isChef = house.ownerId === currentUser.id || currentUser.mediaHouseRole?.includes('Chef') || isAdmin;
  const memberCount = house.members?.length || 1;

  return (
    <View style={styles.card}>
      {/* Bannière de couverture & Logo */}
      <View style={styles.coverWrapper}>
        <Image
          source={{
            uri:
              house.coverImage ||
              'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
          }}
          style={styles.coverImg}
          resizeMode="cover"
        />
        <View style={styles.coverOverlay} />

        <View style={styles.logoRow}>
          <Image
            source={{
              uri:
                house.logo ||
                'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200&auto=format&fit=crop&q=80',
            }}
            style={styles.logoImg}
            resizeMode="cover"
          />

          <View style={styles.badgeWrapper}>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ RÉDACTION AGRÉÉE</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {isChef ? '👑 Chef de Rédaction' : '🖋️ Journaliste Membre'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Titre & Devise */}
      <View style={styles.bodyContent}>
        <View style={styles.titleRow}>
          <Text style={styles.houseName}>{house.name}</Text>
        </View>

        <Text style={styles.houseMotto}>« {house.motto || 'L’information pure et factuelle'} »</Text>

        {house.description ? (
          <Text style={styles.houseDesc} numberOfLines={3}>
            {house.description}
          </Text>
        ) : null}

        {/* Tableau de bord métriques */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{houseArticles.length}</Text>
            <Text style={styles.metricLbl}>Enquêtes</Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{house.followersCount || 1}</Text>
            <Text style={styles.metricLbl}>Abonnés</Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={[styles.metricVal, { color: '#10b981' }]}>
              {house.trustScore || 98}%
            </Text>
            <Text style={styles.metricLbl}>Fiabilité</Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={[styles.metricVal, { color: '#00d2ff' }]}>{totalViews}</Text>
            <Text style={styles.metricLbl}>Lectures</Text>
          </View>
        </View>

        {/* ACTION MAJEURE : PUBLIER DIRECTEMENT DANS CETTE MAISON */}
        <TouchableOpacity
          style={styles.publishActionBtn}
          onPress={() => onOpenCreateArticleForHouse(house.id, house.name)}
          activeOpacity={0.8}
        >
          <Text style={styles.publishActionIcon}>✍️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.publishActionBtnTitle}>
              PUBLIER UN ARTICLE DANS CETTE MAISON
            </Text>
            <Text style={styles.publishActionBtnSub}>
              Diffuser une nouvelle enquête signée « {house.name} »
            </Text>
          </View>
          <Text style={styles.publishActionChevron}>›</Text>
        </TouchableOpacity>

        {/* Onglets secondaires : Articles / Équipe / Stats */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeSubTab === 'articles' && styles.activeTabBtn]}
            onPress={() => setActiveSubTab('articles')}
          >
            <Text style={[styles.tabBtnText, activeSubTab === 'articles' && styles.activeTabBtnText]}>
              📰 Enquêtes ({houseArticles.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeSubTab === 'team' && styles.activeTabBtn]}
            onPress={() => setActiveSubTab('team')}
          >
            <Text style={[styles.tabBtnText, activeSubTab === 'team' && styles.activeTabBtnText]}>
              👥 Équipe ({memberCount}/5)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeSubTab === 'stats' && styles.activeTabBtn]}
            onPress={() => setActiveSubTab('stats')}
          >
            <Text style={[styles.tabBtnText, activeSubTab === 'stats' && styles.activeTabBtnText]}>
              📊 Métriques
            </Text>
          </TouchableOpacity>
        </View>

        {/* CONTENU ONGLETS */}
        {activeSubTab === 'articles' && (
          <View style={styles.articlesList}>
            {loadingArticles ? (
              <ActivityIndicator size="small" color="#00d2ff" style={{ marginVertical: 14 }} />
            ) : houseArticles.length === 0 ? (
              <View style={styles.emptyArticlesBox}>
                <Text style={styles.emptyArticlesIcon}>📝</Text>
                <Text style={styles.emptyArticlesText}>
                  Aucun article publié pour le moment sous cette maison.
                </Text>
                <TouchableOpacity
                  style={styles.firstArticleBtn}
                  onPress={() => onOpenCreateArticleForHouse(house.id, house.name)}
                >
                  <Text style={styles.firstArticleBtnText}>+ Rédiger la première enquête</Text>
                </TouchableOpacity>
              </View>
            ) : (
              houseArticles.map((art) => (
                <TouchableOpacity
                  key={art.id}
                  style={styles.articleItemRow}
                  onPress={() => onSelectArticle && onSelectArticle(art)}
                  activeOpacity={0.7}
                >
                  {art.coverImage && (
                    <Image source={{ uri: art.coverImage }} style={styles.articleThumb} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.articleItemTitle} numberOfLines={2}>
                      {art.title}
                    </Text>
                    <View style={styles.articleItemMetaRow}>
                      <Text style={styles.articleItemDate}>
                        {art.createdAt ? new Date(art.createdAt).toLocaleDateString('fr-FR') : 'Récent'}
                      </Text>
                      <Text style={styles.articleItemStats}>
                        👁️ {art.viewsCount || 0} • ❤️ {art.likesCount || 0}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.articleChevron}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeSubTab === 'team' && (
          <View style={styles.teamBox}>
            <View style={styles.teamHeaderRow}>
              <Text style={styles.teamTitle}>RÉDACTION OFFICIELLE</Text>
              <Text style={styles.teamQuota}>{memberCount} / 5 Journalistes</Text>
            </View>
            <Text style={styles.teamRuleNote}>
              Règle déontologique PURGE : Une maison est limitée à 5 journalistes accrédités pour garantir l'indépendance et la traçabilité.
            </Text>

            <View style={styles.memberCard}>
              <Image
                source={{
                  uri:
                    currentUser.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                }}
                style={styles.memberAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{currentUser.name}</Text>
                <Text style={styles.memberRole}>
                  {isChef ? '👑 Fondateur & Chef de Rédaction' : '🖋️ Journaliste Accrédité'}
                </Text>
              </View>
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>ACTIF</Text>
              </View>
            </View>
          </View>
        )}

        {activeSubTab === 'stats' && (
          <View style={styles.statsBox}>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Total lectures cumulées :</Text>
              <Text style={styles.statsValue}>{totalViews} vues</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Adhésions & Abonnés :</Text>
              <Text style={styles.statsValue}>{house.followersCount || 1} citoyens</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Réactions citoyennes :</Text>
              <Text style={styles.statsValue}>{totalLikes} mentions j'aime</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Commentaires & Débats :</Text>
              <Text style={styles.statsValue}>{totalComments} interventions</Text>
            </View>
          </View>
        )}

        {/* Bouton pour ouvrir la page publique de la rédaction */}
        {onOpenHouseModal && (
          <TouchableOpacity
            style={styles.openPublicPageBtn}
            onPress={() => onOpenHouseModal(house)}
            activeOpacity={0.8}
          >
            <Text style={styles.openPublicPageBtnText}>
              🏛️ VOIR LA PAGE PUBLIQUE COMPLÈTE DE LA MAISON ›
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0c1228',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subTitle: {
    color: '#06b6d4',
    fontSize: 11,
    marginTop: 2,
  },
  badgePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  unregisteredBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  unregisteredBadgeText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: 'bold',
  },
  subText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyDesc: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  createHouseBtn: {
    backgroundColor: '#00d2ff',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  createHouseBtnText: {
    color: '#020512',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  coverWrapper: {
    position: 'relative',
    height: 110,
    backgroundColor: '#020512',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 5, 18, 0.55)',
  },
  logoRow: {
    position: 'absolute',
    bottom: -20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  logoImg: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#0c1228',
    backgroundColor: '#1e293b',
  },
  badgeWrapper: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  verifiedText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  roleBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  roleBadgeText: {
    color: '#06b6d4',
    fontSize: 9,
    fontWeight: 'bold',
  },
  bodyContent: {
    paddingTop: 28,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  houseName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  houseMotto: {
    color: '#00d2ff',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 8,
  },
  houseDesc: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#131b38',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  metricLbl: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  publishActionBtn: {
    backgroundColor: '#00d2ff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  publishActionIcon: {
    fontSize: 22,
  },
  publishActionBtnTitle: {
    color: '#020512',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  publishActionBtnSub: {
    color: '#083344',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  publishActionChevron: {
    color: '#020512',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  tabBtn: {
    paddingVertical: 8,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabBtn: {
    borderBottomColor: '#00d2ff',
  },
  tabBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  activeTabBtnText: {
    color: '#00d2ff',
  },
  articlesList: {
    marginBottom: 10,
  },
  emptyArticlesBox: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#131b38',
    borderRadius: 10,
  },
  emptyArticlesIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  emptyArticlesText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  firstArticleBtn: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00d2ff',
  },
  firstArticleBtnText: {
    color: '#00d2ff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  articleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 10,
  },
  articleThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#1e293b',
  },
  articleItemTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  articleItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  articleItemDate: {
    color: '#64748b',
    fontSize: 10,
  },
  articleItemStats: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: '600',
  },
  articleChevron: {
    color: '#64748b',
    fontSize: 16,
    paddingLeft: 4,
  },
  teamBox: {
    backgroundColor: '#131b38',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  teamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  teamTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  teamQuota: {
    color: '#00d2ff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  teamRuleNote: {
    color: '#64748b',
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 10,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1228',
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
  },
  memberName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  memberRole: {
    color: '#06b6d4',
    fontSize: 10,
    marginTop: 2,
  },
  activePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePillText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: 'bold',
  },
  statsBox: {
    backgroundColor: '#131b38',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  statsValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  openPublicPageBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  openPublicPageBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
});
