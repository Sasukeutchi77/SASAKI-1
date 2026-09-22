import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Article, Comment, User, MediaHouse } from '../types';
import { api } from '../services/api';
import { PollWidget } from '../components/PollWidget';
import { CommentSection } from '../components/CommentSection';
import { MediaHouseDetailModal } from '../components/MediaHouseDetailModal';
import { AppIcon } from '../components/AppIcon';

interface ArticleDetailScreenProps {
  article: Article;
  currentUser: User | null;
  onBack: () => void;
  onOpenAuth?: () => void;
}

export const ArticleDetailScreen: React.FC<ArticleDetailScreenProps> = ({
  article: initialArticle,
  currentUser,
  onBack,
  onOpenAuth,
}) => {
  const [article, setArticle] = useState<Article>(initialArticle);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  // Audio Reader Simulation
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  // Media House Modal
  const [selectedHouse, setSelectedHouse] = useState<MediaHouse | null>(null);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [loadingHouse, setLoadingHouse] = useState(false);

  // Ergonomie de lecture & Progression
  const [fontSizeDelta, setFontSizeDelta] = useState(0); // -2, 0, 2, 4
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isImmersive, setIsImmersive] = useState(false);
  const lastScrollY = useRef(0);
  const [extraReactions, setExtraReactions] = useState<{ useful: boolean; factchecked: boolean }>({
    useful: false,
    factchecked: false,
  });

  useEffect(() => {
    // Enregistrement de la vue
    api.recordView(article.id).catch(() => {});

    // Chargement des commentaires
    const loadComments = async () => {
      try {
        const res = await api.getComments(article.id);
        if (res.comments) {
          setComments(res.comments);
        }
      } catch (e) {
        console.warn('[ArticleDetail] Erreur chargement commentaires:', e);
      } finally {
        setLoadingComments(false);
      }
    };

    loadComments();
  }, [article.id]);

  // Audio synthesis timer
  useEffect(() => {
    let interval: any;
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= 100) {
            setIsPlayingAudio(false);
            return 0;
          }
          return prev + 5;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlayingAudio]);

  const handleToggleLike = async () => {
    const wasLiked = Boolean(article.isLiked);
    const currentLikes = article.likesCount || 0;
    const newLikesCount = wasLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;

    setArticle((prev) => ({
      ...prev,
      isLiked: !wasLiked,
      likesCount: newLikesCount,
    }));

    try {
      await api.toggleLikeArticle(article.id);
    } catch {
      setArticle((prev) => ({
        ...prev,
        isLiked: wasLiked,
        likesCount: currentLikes,
      }));
      if (onOpenAuth) onOpenAuth();
    }
  };

  const handleToggleBookmark = async () => {
    const wasBookmarked = Boolean(article.isBookmarked);
    setArticle((prev) => ({ ...prev, isBookmarked: !wasBookmarked }));

    try {
      await api.toggleBookmarkArticle(article.id);
    } catch {
      setArticle((prev) => ({ ...prev, isBookmarked: wasBookmarked }));
      if (onOpenAuth) onOpenAuth();
    }
  };

  const handleVotePoll = async (optionId: string) => {
    try {
      const res = await api.votePoll(article.id, optionId);
      if (res.poll) {
        setArticle((prev) => ({ ...prev, poll: res.poll }));
      }
    } catch (err: any) {
      Alert.alert('Vote', err.message || 'Impossible d’enregistrer votre vote.');
    }
  };

  const handleAddComment = async (content: string, parentId?: string) => {
    try {
      const res = await api.addComment(article.id, content, parentId);
      if (res.comment) {
        setComments((prev) => [res.comment, ...prev]);
        setArticle((prev) => ({
          ...prev,
          commentsCount: (prev.commentsCount || 0) + 1,
        }));
      }
    } catch (err: any) {
      Alert.alert('Commentaire', err.message || 'Impossible de publier le commentaire.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: article.title,
        message: `${article.title}\n\nÀ lire sur PURGE :\n${api.getApiBaseUrl()}/articles/${article.id}`,
      });
    } catch (err) {
      console.warn('Erreur partage:', err);
    }
  };

  const handleOpenHouse = async () => {
    if (loadingHouse) return;
    setLoadingHouse(true);
    try {
      if (article.mediaId) {
        const res = await api.getMediaHouseById(article.mediaId);
        if (res?.house) {
          setSelectedHouse(res.house);
          setShowHouseModal(true);
          return;
        }
      }
      // Fallback search by name
      const housesRes = await api.getMediaHouses();
      const list = housesRes?.mediaHouses || [];
      const match = list.find(
        (h) => h.id === article.mediaId || (article.mediaName && h.name.toLowerCase() === article.mediaName.toLowerCase())
      );
      if (match) {
        setSelectedHouse(match);
        setShowHouseModal(true);
      } else {
        Alert.alert('Maison de Presse', `Rédaction centrale : ${article.mediaName || 'PURGE'}`);
      }
    } catch {
      Alert.alert('Maison de Presse', `Rédaction officielle : ${article.mediaName || 'PURGE'}`);
    } finally {
      setLoadingHouse(false);
    }
  };

  const defaultCover =
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80';
  const coverUri = article.coverImage || article.coverMedia?.url || defaultCover;
  const trustScore = article.trustScore || 98;
  const estimatedReadTime = Math.max(1, Math.ceil((article.content || '').split(/\s+/).length / 180));

  return (
    <View style={styles.container}>
      {/* Top Header Bar ou Barre Flottante Immersion */}
      {isImmersive ? (
        <View style={styles.floatingImmersiveBar}>
          <TouchableOpacity style={styles.floatingBackBtn} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.floatingBackText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.floatingProgressBadge}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppIcon name="book" size={13} color="#00d2ff" style={{ marginRight: 5 }} />
              <Text style={styles.floatingProgressText}>{Math.round(scrollProgress)}% lu</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.floatingExitBtn}
            onPress={() => setIsImmersive(false)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppIcon name="close" size={12} color="#94a3b8" style={{ marginRight: 4 }} />
              <Text style={styles.floatingExitText}>Quitter immersion</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>‹ RETOUR DÉPÊCHES</Text>
          </TouchableOpacity>

          <View style={styles.topBarActions}>
            {/* Contrôle taille de texte */}
            <View style={styles.fontControlsGroup}>
              <TouchableOpacity
                style={styles.fontBtn}
                onPress={() => setFontSizeDelta((prev) => Math.max(-2, prev - 2))}
                activeOpacity={0.7}
              >
                <Text style={styles.fontBtnText}>A-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fontBtn}
                onPress={() => setFontSizeDelta((prev) => Math.min(6, prev + 2))}
                activeOpacity={0.7}
              >
                <Text style={styles.fontBtnText}>A+</Text>
              </TouchableOpacity>
            </View>

            {/* Bouton Immersion */}
            <TouchableOpacity
              style={styles.topActionBtn}
              onPress={() => setIsImmersive(true)}
              activeOpacity={0.7}
            >
              <AppIcon name="book" size={17} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.topActionBtn} onPress={handleShare} activeOpacity={0.7}>
              <AppIcon name="share-social" size={17} color="#cbd5e1" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topActionBtn}
              onPress={handleToggleBookmark}
              activeOpacity={0.7}
            >
              <AppIcon
                name={article.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={17}
                color={article.isBookmarked ? '#00d2ff' : '#cbd5e1'}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Barre de progression de lecture */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${scrollProgress}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={(e: any) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          const maxScroll = contentSize.height - layoutMeasurement.height;
          if (maxScroll > 0) {
            const pct = (contentOffset.y / maxScroll) * 100;
            setScrollProgress(Math.min(100, Math.max(0, pct)));
          }

          // Détection automatique du sens de défilement pour le mode immersion
          const curY = contentOffset.y;
          const diff = curY - lastScrollY.current;
          if (curY > 200 && diff > 35 && !isImmersive) {
            setIsImmersive(true);
          } else if (diff < -35 && isImmersive) {
            setIsImmersive(false);
          }
          lastScrollY.current = curY;
        }}
        scrollEventThrottle={16}
      >
        {/* Grande Image de Couverture */}
        <View style={styles.coverWrapper}>
          <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
          <View style={styles.badgesOverlay}>
            {article.categoryName && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{article.categoryName}</Text>
              </View>
            )}
            <View style={styles.trustScoreBadge}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="star" size={11} color="#00d2ff" style={{ marginRight: 4 }} />
                <Text style={styles.trustScoreText}>{trustScore}% FIABILITÉ</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.articleBody}>
          {/* Titre Principal */}
          <Text style={styles.title}>{article.title}</Text>

          {/* Ligne Auteur & Métadonnées */}
          <View style={styles.authorRow}>
            {article.authorAvatar ? (
              <Image source={{ uri: article.authorAvatar }} style={styles.authorAvatar} />
            ) : (
              <View style={styles.authorPlaceholder}>
                <Text style={styles.authorInitial}>
                  {article.authorName ? article.authorName.charAt(0).toUpperCase() : 'J'}
                </Text>
              </View>
            )}
            <View style={styles.authorInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.authorName}>{article.authorName}</Text>
                {article.authorIsVerified && (
                  <AppIcon name="checkmark" size={12} color="#00d2ff" style={{ marginLeft: 4 }} />
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={styles.metaText}>
                  {article.mediaName || 'PURGE Rédaction Centrale'} •{' '}
                  {article.createdAt
                    ? new Date(article.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Date récente'}{' '}
                  •{' '}
                </Text>
                <AppIcon name="time" size={11} color="#64748b" style={{ marginRight: 3 }} />
                <Text style={styles.metaText}>~{estimatedReadTime} min</Text>
              </View>
            </View>

            {/* Bouton pour explorer la maison de presse */}
            <TouchableOpacity style={styles.housePillBtn} onPress={handleOpenHouse} activeOpacity={0.8}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="business" size={11} color="#00d2ff" style={{ marginRight: 4 }} />
                <Text style={styles.housePillText}>RÉDACTION</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Lecteur Audio de Synthèse Vocale */}
          <View style={styles.audioPlayerCard}>
            <View style={styles.audioTopRow}>
              <TouchableOpacity
                style={styles.playAudioBtn}
                onPress={() => setIsPlayingAudio(!isPlayingAudio)}
                activeOpacity={0.8}
              >
                <AppIcon name={isPlayingAudio ? 'pause' : 'play'} size={16} color="#020512" />
              </TouchableOpacity>
              <View style={styles.audioInfoCol}>
                <Text style={styles.audioTitle}>
                  {isPlayingAudio ? 'Lecture audio en cours...' : 'Écouter la synthèse vocale'}
                </Text>
                <Text style={styles.audioSub}>
                  Voix de synthèse journalistique • Durée : {article.readTime || 4} min
                </Text>
              </View>
              <Text style={styles.audioSpeedBadge}>1.0x</Text>
            </View>
            {isPlayingAudio && (
              <View style={styles.progressBarWrapper}>
                <View style={[styles.progressFill, { width: `${audioProgress}%` }]} />
              </View>
            )}
          </View>

          {/* Résumé / Chapeau */}
          {article.summary ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>{article.summary}</Text>
            </View>
          ) : null}

          {/* Contenu Développé de l'article */}
          <View style={styles.contentTextWrapper}>
            {article.content.split('\n\n').map((paragraph, idx) => (
              <Text
                key={idx}
                style={[
                  styles.paragraph,
                  {
                    fontSize: 14 + fontSizeDelta,
                    lineHeight: 22 + fontSizeDelta * 1.5,
                  },
                ]}
              >
                {paragraph}
              </Text>
            ))}
          </View>

          {/* Audit Factuel & Déontologique */}
          <View style={styles.auditCard}>
            <View style={styles.auditHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="shield-checkmark" size={14} color="#10b981" style={{ marginRight: 6 }} />
                <Text style={styles.auditTitle}>AUDIT FACTUEL & CONTRÔLE DÉONTOLOGIQUE</Text>
              </View>
              <Text style={styles.auditScoreVal}>{trustScore}%</Text>
            </View>
            <View style={styles.auditItem}>
              <AppIcon name="checkmark" size={12} color="#10b981" style={{ marginRight: 6, marginTop: 2 }} />
              <Text style={styles.auditItemText}>
                Sources officielles et déclarations recoupées auprès de témoins directs.
              </Text>
            </View>
            <View style={styles.auditItem}>
              <AppIcon name="checkmark" size={12} color="#10b981" style={{ marginRight: 6, marginTop: 2 }} />
              <Text style={styles.auditItemText}>
                Indépendance éditoriale certifiée selon la charte des Maisons de Presse PURGE.
              </Text>
            </View>
          </View>

          {/* Tags de l'article */}
          {article.tags && article.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {article.tags.map((t, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>#{t.replace(/^#/, '')}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Widget Sondage si présent */}
          {article.poll && (
            <PollWidget poll={article.poll} onVote={handleVotePoll} />
          )}

          {/* Réactions Citoyennes Complémentaires */}
          <View style={styles.reactionsRow}>
            <TouchableOpacity
              style={[styles.reactChip, extraReactions.useful && styles.activeReactChip]}
              onPress={() => setExtraReactions((prev) => ({ ...prev, useful: !prev.useful }))}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon
                  name="bulb"
                  size={12}
                  color={extraReactions.useful ? '#00d2ff' : '#94a3b8'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.reactChipText, extraReactions.useful && styles.activeReactChipText]}>
                  Utile & Éclairant {extraReactions.useful ? '• 1' : ''}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.reactChip, extraReactions.factchecked && styles.activeReactChip]}
              onPress={() =>
                setExtraReactions((prev) => ({ ...prev, factchecked: !prev.factchecked }))
              }
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon
                  name="shield-checkmark"
                  size={12}
                  color={extraReactions.factchecked ? '#00d2ff' : '#94a3b8'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.reactChipText, extraReactions.factchecked && styles.activeReactChipText]}>
                  Rigoureux & Vérifié {extraReactions.factchecked ? '• 1' : ''}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Barre d'engagement au bas de l'article */}
          <View style={styles.engagementBar}>
            <TouchableOpacity
              style={[styles.engageBtn, article.isLiked && styles.activeEngageBtn]}
              onPress={handleToggleLike}
              activeOpacity={0.7}
            >
              <AppIcon
                name={article.isLiked ? 'heart' : 'heart-outline'}
                size={18}
                color={article.isLiked ? '#ef4444' : '#94a3b8'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.engageText, article.isLiked && styles.activeEngageText]}>
                {article.likesCount || 0} Soutiens
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.engageBtn, article.isBookmarked && styles.activeEngageBtn]}
              onPress={handleToggleBookmark}
              activeOpacity={0.7}
            >
              <AppIcon
                name={article.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={article.isBookmarked ? '#00d2ff' : '#94a3b8'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.engageText, article.isBookmarked && styles.activeEngageText]}>
                {article.isBookmarked ? 'Enregistré' : 'Sauvegarder'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.engageBtn} onPress={handleShare} activeOpacity={0.7}>
              <AppIcon name="share-social" size={18} color="#94a3b8" style={{ marginRight: 6 }} />
              <Text style={styles.engageText}>Partager</Text>
            </TouchableOpacity>
          </View>

          {/* Section Commentaires */}
          {loadingComments ? (
            <ActivityIndicator size="small" color="#06b6d4" style={{ marginVertical: 20 }} />
          ) : (
            <CommentSection
              comments={comments}
              currentUser={currentUser}
              onAddComment={handleAddComment}
              onOpenAuth={onOpenAuth}
            />
          )}
        </View>
      </ScrollView>

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
  topBar: {
    height: 52,
    backgroundColor: '#020512',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  floatingImmersiveBar: {
    height: 48,
    backgroundColor: 'rgba(2, 5, 18, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 210, 255, 0.3)',
  },
  floatingBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#081028',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  floatingBackText: {
    color: '#06b6d4',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: -2,
  },
  floatingProgressBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  floatingProgressText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  floatingExitBtn: {
    backgroundColor: '#081028',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  floatingExitText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#081028',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  backBtnText: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  topActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#081028',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  topActionIcon: {
    fontSize: 15,
  },
  scrollContent: {
    paddingBottom: 50,
  },
  coverWrapper: {
    width: '100%',
    height: 240,
    position: 'relative',
    backgroundColor: '#0a1026',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  badgesOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: 'rgba(2, 5, 18, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  categoryBadgeText: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trustScoreBadge: {
    backgroundColor: 'rgba(2, 5, 18, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  trustScoreText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: 'bold',
  },
  articleBody: {
    padding: 16,
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    marginBottom: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  authorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  authorPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0c1a3b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  authorInitial: {
    color: '#06b6d4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  verifiedIcon: {
    color: '#06b6d4',
    fontSize: 13,
    fontWeight: 'bold',
  },
  metaText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  housePillBtn: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  housePillText: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: 'bold',
  },
  audioPlayerCard: {
    backgroundColor: '#081028',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  audioTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playAudioBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playAudioIcon: {
    color: '#020512',
    fontSize: 14,
    fontWeight: 'bold',
  },
  audioInfoCol: {
    flex: 1,
  },
  audioTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  audioSub: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  audioSpeedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressBarWrapper: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#06b6d4',
  },
  summaryBox: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#06b6d4',
    padding: 14,
    borderRadius: 8,
    marginBottom: 18,
  },
  summaryText: {
    color: '#bae6fd',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  contentTextWrapper: {
    marginBottom: 20,
  },
  paragraph: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },
  auditCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  auditTitle: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  auditScoreVal: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: 'bold',
  },
  auditItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  auditItemIcon: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 12,
  },
  auditItemText: {
    color: '#94a3b8',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  tagChip: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagChipText: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: 'bold',
  },
  engagementBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 16,
  },
  engageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activeEngageBtn: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
  },
  engageIcon: {
    fontSize: 16,
  },
  engageText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  activeEngageText: {
    color: '#06b6d4',
    fontWeight: '800',
  },
  // Nouveaux styles Ergonomie & Lecture
  fontControlsGroup: {
    flexDirection: 'row',
    backgroundColor: '#081028',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  fontBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00d2ff',
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  reactChip: {
    backgroundColor: '#081028',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  activeReactChip: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: '#06b6d4',
  },
  reactChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  activeReactChipText: {
    color: '#38bdf8',
    fontWeight: '700',
  },
});

