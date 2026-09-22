import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { MediaHouse, Article, User, isJournalistRole, isAdminRole } from '../types';
import { api } from '../services/api';
import { CreateHouseModal } from '../components/CreateHouseModal';
import { MediaHouseDetailModal } from '../components/MediaHouseDetailModal';
import { AppIcon } from '../components/AppIcon';

interface HouseScreenProps {
  currentUser: User | null;
  onSelectArticle: (article: Article) => void;
  onOpenCreateArticle: (houseId?: string, houseName?: string) => void;
  onRequireAuth: () => void;
  onUserUpdated: (user: User) => void;
}

export const HouseScreen: React.FC<HouseScreenProps> = ({
  currentUser,
  onSelectArticle,
  onOpenCreateArticle,
  onRequireAuth,
  onUserUpdated,
}) => {
  const [activeSegment, setActiveSegment] = useState<'my_house' | 'directory'>('my_house');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [myHouse, setMyHouse] = useState<MediaHouse | null>(null);
  const [houseArticles, setHouseArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState<boolean>(false);
  const [allHouses, setAllHouses] = useState<MediaHouse[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeHouseTab, setActiveHouseTab] = useState<'articles' | 'team' | 'info'>('articles');

  // Modals
  const [showCreateHouseModal, setShowCreateHouseModal] = useState<boolean>(false);
  const [selectedHouseDetail, setSelectedHouseDetail] = useState<MediaHouse | null>(null);
  const [showHouseDetailModal, setShowHouseDetailModal] = useState<boolean>(false);

  const isJournalist = currentUser ? isJournalistRole(currentUser.role) : false;
  const isAdmin = currentUser ? isAdminRole(currentUser.role) : false;
  const canPublish = isJournalist || isAdmin;

  const loadData = useCallback(async () => {
    try {
      const res = await api.getMediaHouses();
      const list = res.mediaHouses || [];
      setAllHouses(list);

      if (currentUser) {
        // Trouver la maison de l'utilisateur
        const found = list.find(
          (h) =>
            (currentUser.mediaId && h.id === currentUser.mediaId) ||
            (currentUser.mediaName && h.name.toLowerCase() === currentUser.mediaName.toLowerCase()) ||
            h.ownerId === currentUser.id ||
            (h.members && h.members.includes(currentUser.id))
        );

        if (found) {
          setMyHouse(found);
          loadHouseArticles(found.id, found.name);
        } else if (currentUser.mediaName) {
          // Maison enregistrée sur le profil utilisateur
          const virtualHouse: MediaHouse = {
            id: currentUser.mediaId || `house_${currentUser.id}`,
            name: currentUser.mediaName,
            slug: currentUser.mediaName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            logo: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=300&auto=format&fit=crop&q=80',
            coverImage: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
            description: 'Maison de presse officielle fondée par la rédaction.',
            motto: 'L’information vérifiée et sans compromis.',
            specialties: ['Investigation', 'Société & Citoyenneté'],
            ownerId: currentUser.id,
            ownerName: currentUser.name,
            members: [currentUser.id],
            followersCount: currentUser.followersCount || 1,
            articlesCount: currentUser.articlesCount || 0,
            isVerified: true,
            trustScore: 96,
            createdAt: new Date().toISOString(),
          };
          setMyHouse(virtualHouse);
          loadHouseArticles(virtualHouse.id, virtualHouse.name);
        } else {
          setMyHouse(null);
          setHouseArticles([]);
        }
      } else {
        setMyHouse(null);
        setHouseArticles([]);
      }
    } catch (err) {
      console.warn('[HouseScreen] Erreur chargement maisons:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadHouseArticles = async (houseId: string, houseName?: string) => {
    setLoadingArticles(true);
    try {
      const res = await api.getArticles({ mediaHouseId: houseId, limit: 30 });
      let articles = res.articles || [];

      // Si aucun article trouvé par id direct, chercher par nom de maison ou auteur
      if (articles.length === 0 && houseName) {
        const allRes = await api.getArticles({ limit: 50 });
        articles = (allRes.articles || []).filter(
          (a) =>
            a.mediaId === houseId ||
            (a.mediaName && a.mediaName.toLowerCase() === houseName.toLowerCase()) ||
            (currentUser && a.authorId === currentUser.id)
        );
      }

      setHouseArticles(articles);
    } catch (err) {
      console.warn('[HouseScreen] Erreur chargement articles de la maison:', err);
    } finally {
      setLoadingArticles(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleHouseCreated = (newHouse: MediaHouse) => {
    setMyHouse(newHouse);
    setActiveSegment('my_house');
    loadData();
    if (currentUser) {
      const updated: User = {
        ...currentUser,
        mediaId: newHouse.id,
        mediaName: newHouse.name,
        mediaHouseRole: 'Chef de Rédaction',
        role: currentUser.role === 'admin' ? 'admin' : 'journalist',
        isVerified: true,
      };
      onUserUpdated(updated);
    }
  };

  // Filtrage de l'annuaire
  const filteredHouses = allHouses.filter((h) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      h.name.toLowerCase().includes(q) ||
      (h.description && h.description.toLowerCase().includes(q)) ||
      (h.ownerName && h.ownerName.toLowerCase().includes(q)) ||
      (h.specialties && h.specialties.some((s) => s.toLowerCase().includes(q)))
    );
  });

  const totalViews = houseArticles.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
  const memberCount = myHouse?.members?.length || 1;
  const isChef =
    currentUser &&
    myHouse &&
    (myHouse.ownerId === currentUser.id ||
      currentUser.mediaHouseRole?.includes('Chef') ||
      isAdminRole(currentUser.role));

  return (
    <View style={styles.container}>
      {/* Sélecteur de sous-vue : Ma Maison / Annuaire */}
      <View style={styles.segmentBar}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'my_house' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('my_house')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon
              name="business"
              size={14}
              color={activeSegment === 'my_house' ? '#00d2ff' : '#94a3b8'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'my_house' && styles.segmentTextActive,
              ]}
            >
              {myHouse ? myHouse.name : 'Ma Maison de Presse'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'directory' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('directory')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon
              name="globe"
              size={14}
              color={activeSegment === 'directory' ? '#00d2ff' : '#94a3b8'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'directory' && styles.segmentTextActive,
              ]}
            >
              Annuaire Rédactions ({allHouses.length})
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00d2ff" />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#00d2ff" />
            <Text style={styles.loadingText}>Chargement de l’espace rédaction...</Text>
          </View>
        ) : activeSegment === 'my_house' ? (
          /* ========================================================================= */
          /* VUE 1 : ESPACE DE LA MAISON DU JOURNALISTE                                 */
          /* ========================================================================= */
          !currentUser ? (
            /* Cas 1 : Utilisateur non connecté */
            <View style={styles.card}>
              <View style={styles.emptyIconBox}>
                <AppIcon name="business" size={32} color="#00d2ff" />
              </View>
              <Text style={styles.cardTitle}>ESPACE MAISONS DE PRESSE</Text>
              <Text style={styles.cardDesc}>
                Les maisons de presse permettent aux journalistes d’investigation accrédités de
                fonder un organe d’information officiel et d’y publier leurs enquêtes exclusives.
              </Text>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={onRequireAuth}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryActionBtnText}>SE CONNECTER / CRÉER UN COMPTE</Text>
              </TouchableOpacity>
            </View>
          ) : myHouse ? (
            /* Cas 2 : Le journaliste a une maison de presse existante */
            <View>
              {/* Carte Hero Banner de la Maison */}
              <View style={styles.heroCard}>
                <Image
                  source={{
                    uri:
                      myHouse.coverImage ||
                      'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
                  }}
                  style={styles.heroCover}
                  resizeMode="cover"
                />
                <View style={styles.heroOverlay} />

                <View style={styles.heroHeaderRow}>
                  <Image
                    source={{
                      uri:
                        myHouse.logo ||
                        'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200&auto=format&fit=crop&q=80',
                    }}
                    style={styles.heroLogo}
                    resizeMode="cover"
                  />

                  <View style={styles.heroBadgesCol}>
                    <View style={styles.verifiedBadge}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <AppIcon name="checkmark" size={10} color="#10b981" style={{ marginRight: 3 }} />
                        <Text style={styles.verifiedBadgeText}>RÉDACTION ACCRÉDITÉE</Text>
                      </View>
                    </View>
                    <View style={styles.roleBadge}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <AppIcon
                          name={isChef ? 'ribbon' : 'create'}
                          size={10}
                          color="#00d2ff"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.roleBadgeText}>
                          {isChef ? 'Chef de Rédaction (Fondateur)' : 'Journaliste Membre'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.heroBody}>
                  <Text style={styles.houseTitle}>{myHouse.name}</Text>
                  <Text style={styles.houseMotto}>
                    « {myHouse.motto || 'L’information vérifiée et sans compromis.'} »
                  </Text>
                  {myHouse.description ? (
                    <Text style={styles.houseDescription} numberOfLines={3}>
                      {myHouse.description}
                    </Text>
                  ) : null}
                </View>

                {/* Métriques d'Impact & Confiance */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricVal}>{houseArticles.length}</Text>
                    <Text style={styles.metricLbl}>Enquêtes</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricVal}>{myHouse.followersCount || 1}</Text>
                    <Text style={styles.metricLbl}>Abonnés</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={[styles.metricVal, { color: '#10b981' }]}>
                      {myHouse.trustScore || 98}%
                    </Text>
                    <Text style={styles.metricLbl}>Fiabilité</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={[styles.metricVal, { color: '#00d2ff' }]}>{totalViews}</Text>
                    <Text style={styles.metricLbl}>Lectures</Text>
                  </View>
                </View>
              </View>

              {/* BOUTON MAJEUR : PUBLIER UN ARTICLE DIRECTEMENT DANS CETTE MAISON */}
              <TouchableOpacity
                style={styles.publishMainBtn}
                onPress={() => onOpenCreateArticle(myHouse.id, myHouse.name)}
                activeOpacity={0.85}
              >
                <View style={styles.publishBtnIconCircle}>
                  <AppIcon name="create" size={18} color="#020512" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.publishBtnTitle}>
                    PUBLIER UN ARTICLE DANS CETTE MAISON
                  </Text>
                  <Text style={styles.publishBtnSub}>
                    Diffuser une enquête officielle signée « {myHouse.name} »
                  </Text>
                </View>
                <AppIcon name="arrow-forward" size={16} color="#020512" />
              </TouchableOpacity>

              {/* Barre d'onglets de la maison (Articles / Équipe / Infos) */}
              <View style={styles.houseTabsBar}>
                <TouchableOpacity
                  style={[styles.houseTabBtn, activeHouseTab === 'articles' && styles.houseTabBtnActive]}
                  onPress={() => setActiveHouseTab('articles')}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AppIcon
                      name="newspaper"
                      size={13}
                      color={activeHouseTab === 'articles' ? '#00d2ff' : '#94a3b8'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.houseTabText,
                        activeHouseTab === 'articles' && styles.houseTabTextActive,
                      ]}
                    >
                      Enquêtes ({houseArticles.length})
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.houseTabBtn, activeHouseTab === 'team' && styles.houseTabBtnActive]}
                  onPress={() => setActiveHouseTab('team')}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AppIcon
                      name="people"
                      size={13}
                      color={activeHouseTab === 'team' ? '#00d2ff' : '#94a3b8'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.houseTabText,
                        activeHouseTab === 'team' && styles.houseTabTextActive,
                      ]}
                    >
                      Équipe ({memberCount}/5)
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.houseTabBtn, activeHouseTab === 'info' && styles.houseTabBtnActive]}
                  onPress={() => setActiveHouseTab('info')}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AppIcon
                      name="information-circle"
                      size={13}
                      color={activeHouseTab === 'info' ? '#00d2ff' : '#94a3b8'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.houseTabText,
                        activeHouseTab === 'info' && styles.houseTabTextActive,
                      ]}
                    >
                      Coordonnées & Ligne
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Contenu de l'onglet actif */}
              {activeHouseTab === 'articles' ? (
                /* Liste des articles publiés dans cette maison */
                <View style={styles.tabContentBlock}>
                  {loadingArticles ? (
                    <View style={styles.centerBoxSmall}>
                      <ActivityIndicator size="small" color="#00d2ff" />
                      <Text style={styles.loadingText}>Chargement des publications...</Text>
                    </View>
                  ) : houseArticles.length === 0 ? (
                    <View style={styles.emptyArticlesBox}>
                      <AppIcon name="document-text" size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
                      <Text style={styles.emptyArticlesTitle}>Aucune enquête publiée pour l'instant</Text>
                      <Text style={styles.emptyArticlesSub}>
                        Faites rayonner votre maison « {myHouse.name} » en publiant votre première dépêche factuelle.
                      </Text>
                      <TouchableOpacity
                        style={styles.createFirstArticleBtn}
                        onPress={() => onOpenCreateArticle(myHouse.id, myHouse.name)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                          <AppIcon name="create" size={14} color="#00d2ff" style={{ marginRight: 6 }} />
                          <Text style={styles.createFirstArticleBtnText}>
                            RÉDIGER LA PREMIÈRE ENQUÊTE
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    houseArticles.map((article) => (
                      <TouchableOpacity
                        key={article.id}
                        style={styles.articleCard}
                        onPress={() => onSelectArticle(article)}
                        activeOpacity={0.8}
                      >
                        {article.coverImage && (
                          <Image
                            source={{ uri: article.coverImage }}
                            style={styles.articleCover}
                            resizeMode="cover"
                          />
                        )}
                        <View style={styles.articleBody}>
                          <View style={styles.articleMetaRow}>
                            <View style={styles.categoryPill}>
                              <Text style={styles.categoryPillText}>
                                {article.categoryName || 'ENQUÊTE'}
                              </Text>
                            </View>
                            <Text style={styles.articleDate}>
                              {article.createdAt
                                ? new Date(article.createdAt).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                  })
                                : 'Récent'}
                            </Text>
                          </View>

                          <Text style={styles.articleTitle} numberOfLines={2}>
                            {article.title}
                          </Text>
                          {article.summary ? (
                            <Text style={styles.articleSummary} numberOfLines={2}>
                              {article.summary}
                            </Text>
                          ) : null}

                          <View style={styles.articleFooter}>
                            <Text style={styles.articleAuthor}>Par {article.authorName}</Text>
                            <View style={styles.articleStatsRow}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <AppIcon name="eye" size={11} color="#64748b" />
                                <Text style={styles.articleStat}>{article.viewsCount || 0}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <AppIcon name="heart" size={11} color="#ef4444" />
                                <Text style={styles.articleStat}>{article.likesCount || 0}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <AppIcon name="chatbubble" size={11} color="#00d2ff" />
                                <Text style={styles.articleStat}>{article.commentsCount || 0}</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              ) : activeHouseTab === 'team' ? (
                /* Équipe rédactionnelle */
                <View style={styles.tabContentBlock}>
                  <View style={styles.quotaBox}>
                    <View style={styles.quotaHeader}>
                      <Text style={styles.quotaTitle}>QUOTA DÉONTOLOGIQUE DE RÉDACTION</Text>
                      <Text style={styles.quotaScore}>{memberCount} / 5 Journalistes</Text>
                    </View>
                    <View style={styles.quotaBar}>
                      <View
                        style={[
                          styles.quotaBarFill,
                          { width: `${Math.min(100, (memberCount / 5) * 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.quotaNote}>
                      Conformément à la charte PURGE, une maison de presse regroupe au maximum 5 journalistes accrédités pour garantir l'indépendance éditoriale.
                    </Text>
                  </View>

                  <View style={styles.memberCard}>
                    <View style={styles.memberAvatarCircle}>
                      <AppIcon name="ribbon" size={18} color="#00d2ff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{myHouse.ownerName || currentUser.name}</Text>
                      <Text style={styles.memberRole}>Chef de Rédaction (Fondateur)</Text>
                    </View>
                    <View style={styles.memberBadge}>
                      <Text style={styles.memberBadgeText}>ACTIF</Text>
                    </View>
                  </View>
                </View>
              ) : (
                /* Onglet Coordonnées & Ligne éditoriale */
                <View style={styles.tabContentBlock}>
                  <View style={styles.infoCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <AppIcon name="business" size={14} color="#00d2ff" style={{ marginRight: 6 }} />
                      <Text style={styles.infoSectionTitle}>IDENTITÉ ÉDITORIALE</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Nom :</Text>
                      <Text style={styles.infoValue}>{myHouse.name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Devise :</Text>
                      <Text style={styles.infoValue}>« {myHouse.motto} »</Text>
                    </View>
                    {myHouse.email && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email Rédaction :</Text>
                        <Text style={styles.infoValue}>{myHouse.email}</Text>
                      </View>
                    )}
                    {myHouse.website && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Site web :</Text>
                        <Text style={styles.infoValue}>{myHouse.website}</Text>
                      </View>
                    )}
                    {myHouse.address && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Bureau :</Text>
                        <Text style={styles.infoValue}>{myHouse.address}</Text>
                      </View>
                    )}
                  </View>

                  {myHouse.specialties && myHouse.specialties.length > 0 && (
                    <View style={styles.infoCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <AppIcon name="search" size={14} color="#00d2ff" style={{ marginRight: 6 }} />
                        <Text style={styles.infoSectionTitle}>DOMAINES D'INVESTIGATION</Text>
                      </View>
                      <View style={styles.chipsRow}>
                        {myHouse.specialties.map((spec, i) => (
                          <View key={i} style={styles.specChip}>
                            <Text style={styles.specChipText}>{spec}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : canPublish ? (
            /* Cas 3 : L'utilisateur est journaliste/admin mais n'a pas encore fondé de maison */
            <View style={styles.card}>
              <View style={styles.emptyIconBox}>
                <AppIcon name="business" size={32} color="#00d2ff" />
              </View>
              <Text style={styles.cardTitle}>FONDEZ VOTRE PROPRE MAISON DE PRESSE</Text>
              <Text style={styles.cardDesc}>
                En tant que journaliste accrédité PURGE, vous avez le privilège de fonder votre
                propre maison de presse. Vous en deviendrez le Chef de Rédaction et vous pourrez
                y publier toutes vos enquêtes et dépêches exclusives.
              </Text>

              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={() => setShowCreateHouseModal(true)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="business" size={14} color="#020512" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionBtnText}>FONDER MA MAISON DE PRESSE</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            /* Cas 4 : Simple citoyen débattant */
            <View style={styles.card}>
              <View style={styles.emptyIconBox}>
                <AppIcon name="create" size={32} color="#00d2ff" />
              </View>
              <Text style={styles.cardTitle}>RÉSERVÉ AUX JOURNALISTES ACCRÉDITÉS</Text>
              <Text style={styles.cardDesc}>
                Seuls les journalistes officiellement accrédités par la Rédaction en Chef de PURGE
                peuvent fonder une maison de presse et diffuser des enquêtes d'investigation.
              </Text>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={onRequireAuth}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="create" size={14} color="#020512" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionBtnText}>
                    DEMANDER UNE ACCRÉDITATION JOURNALISTE
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )
        ) : (
          /* ========================================================================= */
          /* VUE 2 : ANNUAIRE GLOBAL DES MAISONS DE PRESSE                              */
          /* ========================================================================= */
          <View>
            <View style={styles.searchBarBox}>
              <AppIcon name="search" size={16} color="#64748b" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une rédaction accréditée..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                  <AppIcon name="close" size={14} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {canPublish && (
              <View style={styles.createHouseBanner}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.createHouseBannerTitle}>Vous êtes journaliste ?</Text>
                  <Text style={styles.createHouseBannerDesc}>
                    Fondez votre organe d'investigation et publiez sous votre marque.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.createHouseBannerBtn}
                  onPress={() => setShowCreateHouseModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.createHouseBannerBtnText}>+ FONDER</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.directoryHeader}>RÉDACTIONS OFFICIELLES AGRÉÉES</Text>

            {filteredHouses.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Aucune maison trouvée pour « {searchQuery} »</Text>
              </View>
            ) : (
              filteredHouses.map((house) => (
                <TouchableOpacity
                  key={house.id}
                  style={styles.directoryCard}
                  onPress={() => {
                    setSelectedHouseDetail(house);
                    setShowHouseDetailModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{
                      uri:
                        house.logo ||
                        'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200&auto=format&fit=crop&q=80',
                    }}
                    style={styles.directoryLogo}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <View style={styles.directoryTitleRow}>
                      <Text style={styles.directoryName}>{house.name}</Text>
                      {house.isVerified && (
                        <View style={styles.dirVerifiedBadge}>
                          <AppIcon name="checkmark" size={10} color="#10b981" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.directoryMotto} numberOfLines={1}>
                      « {house.motto || 'L’information sans compromis'} »
                    </Text>
                    <View style={styles.directoryStatsRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <AppIcon name="newspaper" size={11} color="#64748b" />
                        <Text style={styles.directoryStat}>{house.articlesCount || 0} enquêtes</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <AppIcon name="people" size={11} color="#64748b" />
                        <Text style={styles.directoryStat}>{house.followersCount || 1} abonnés</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <AppIcon name="shield-checkmark" size={11} color="#10b981" />
                        <Text style={[styles.directoryStat, { color: '#10b981' }]}>
                          {house.trustScore || 98}%
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.directoryChevron}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modale de création d'une maison de presse */}
      <CreateHouseModal
        visible={showCreateHouseModal}
        currentUser={currentUser}
        onSuccess={handleHouseCreated}
        onClose={() => setShowCreateHouseModal(false)}
      />

      {/* Modale de détails d'une maison sélectionnée dans l'annuaire */}
      <MediaHouseDetailModal
        visible={showHouseDetailModal}
        house={selectedHouseDetail}
        currentUser={currentUser}
        onSelectArticle={onSelectArticle}
        onRequireAuth={onRequireAuth}
        onClose={() => setShowHouseDetailModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020512',
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: '#040817',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.18)',
    borderColor: '#06b6d4',
  },
  segmentText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#00d2ff',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBoxSmall: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
  },
  card: {
    backgroundColor: '#060b24',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    padding: 20,
    alignItems: 'center',
    marginVertical: 10,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 32,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryActionBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroCard: {
    backgroundColor: '#060b24',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    marginBottom: 14,
  },
  heroCover: {
    width: '100%',
    height: 120,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    backgroundColor: 'rgba(2, 5, 18, 0.45)',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginTop: -36,
    gap: 12,
  },
  heroLogo: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00d2ff',
    backgroundColor: '#020512',
  },
  heroBadgesCol: {
    flex: 1,
    gap: 4,
    paddingBottom: 4,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  verifiedBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  roleBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: '#06b6d4',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    color: '#00d2ff',
    fontSize: 10,
    fontWeight: '700',
  },
  heroBody: {
    padding: 16,
    paddingTop: 12,
  },
  houseTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  houseMotto: {
    color: '#38bdf8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  houseDescription: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(6, 182, 212, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(2, 5, 18, 0.6)',
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricVal: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  metricLbl: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  publishMainBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#38bdf8',
    shadowColor: '#0284c7',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  publishBtnIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  publishBtnIcon: {
    fontSize: 22,
  },
  publishBtnTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  publishBtnSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  publishBtnChevron: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
  },
  houseTabsBar: {
    flexDirection: 'row',
    backgroundColor: '#040817',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    marginBottom: 14,
  },
  houseTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  houseTabBtnActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
  },
  houseTabText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  houseTabTextActive: {
    color: '#00d2ff',
    fontWeight: '800',
  },
  tabContentBlock: {
    gap: 12,
  },
  emptyArticlesBox: {
    backgroundColor: '#060b24',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    padding: 24,
    alignItems: 'center',
    marginVertical: 8,
  },
  emptyArticlesEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  emptyArticlesTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyArticlesSub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  createFirstArticleBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  createFirstArticleBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  articleCard: {
    backgroundColor: '#060b24',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  articleCover: {
    width: '100%',
    height: 120,
  },
  articleBody: {
    padding: 12,
  },
  articleMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryPill: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryPillText: {
    color: '#00d2ff',
    fontSize: 10,
    fontWeight: '800',
  },
  articleDate: {
    color: '#64748b',
    fontSize: 11,
  },
  articleTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    marginBottom: 4,
  },
  articleSummary: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 8,
    marginTop: 4,
  },
  articleAuthor: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  articleStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  articleStat: {
    color: '#64748b',
    fontSize: 11,
  },
  quotaBox: {
    backgroundColor: '#060b24',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quotaTitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  quotaScore: {
    color: '#00d2ff',
    fontSize: 12,
    fontWeight: '800',
  },
  quotaBar: {
    height: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  quotaBarFill: {
    height: '100%',
    backgroundColor: '#00d2ff',
  },
  quotaNote: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#060b24',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    gap: 12,
  },
  memberAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarEmoji: {
    fontSize: 20,
  },
  memberName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  memberRole: {
    color: '#38bdf8',
    fontSize: 11,
    marginTop: 2,
  },
  memberBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  memberBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  infoCard: {
    backgroundColor: '#060b24',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  infoSectionTitle: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specChip: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  specChipText: {
    color: '#00d2ff',
    fontSize: 11,
    fontWeight: '700',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#060b24',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
  },
  clearSearch: {
    color: '#64748b',
    fontSize: 14,
    padding: 4,
  },
  createHouseBanner: {
    backgroundColor: '#040d2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0284c7',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  createHouseBannerTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  createHouseBannerDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  createHouseBannerBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createHouseBannerBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  directoryHeader: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  directoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#060b24',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    gap: 12,
  },
  directoryLogo: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    backgroundColor: '#020512',
  },
  directoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  directoryName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  dirVerifiedBadge: {
    backgroundColor: '#10b981',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirVerifiedBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  directoryMotto: {
    color: '#94a3b8',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  directoryStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  directoryStat: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  directoryChevron: {
    color: '#64748b',
    fontSize: 18,
  },
});
