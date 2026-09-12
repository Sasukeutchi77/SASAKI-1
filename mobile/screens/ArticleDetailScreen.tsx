import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Article, Comment, User } from '../types';
import { api } from '../services/api';
import { PollWidget } from '../components/PollWidget';
import { CommentSection } from '../components/CommentSection';

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

  const handleToggleLike = async () => {
    const wasLiked = Boolean(article.isLiked);
    const newLikesCount = wasLiked ? Math.max(0, article.likesCount - 1) : article.likesCount + 1;

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
        likesCount: article.likesCount,
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
      alert(err.message || 'Impossible d’enregistrer votre vote.');
    }
  };

  const handleAddComment = async (content: string) => {
    try {
      const res = await api.addComment(article.id, content);
      if (res.comment) {
        setComments((prev) => [res.comment, ...prev]);
        setArticle((prev) => ({
          ...prev,
          commentsCount: (prev.commentsCount || 0) + 1,
        }));
      }
    } catch (err: any) {
      alert(err.message || 'Impossible de publier le commentaire.');
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

  const defaultCover =
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80';
  const coverUri = article.coverImage || article.coverMedia?.url || defaultCover;

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹ RETOUR</Text>
        </TouchableOpacity>

        <View style={styles.topBarActions}>
          <TouchableOpacity style={styles.topActionBtn} onPress={handleShare} activeOpacity={0.7}>
            <Text style={styles.topActionIcon}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topActionBtn}
            onPress={handleToggleBookmark}
            activeOpacity={0.7}
          >
            <Text style={styles.topActionIcon}>{article.isBookmarked ? '🔖' : '📑'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Grande Image de Couverture */}
        <View style={styles.coverWrapper}>
          <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
          {article.categoryName && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{article.categoryName}</Text>
            </View>
          )}
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
                {article.authorIsVerified && <Text style={styles.verifiedIcon}> ✓</Text>}
              </View>
              <Text style={styles.metaText}>
                {article.mediaName || 'PURGE Rédaction'} •{' '}
                {new Date(article.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
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
              <Text key={idx} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>

          {/* Widget Sondage si présent */}
          {article.poll && (
            <PollWidget poll={article.poll} onVote={handleVotePoll} />
          )}

          {/* Barre d'engagement au bas de l'article */}
          <View style={styles.engagementBar}>
            <TouchableOpacity
              style={[styles.engageBtn, article.isLiked && styles.activeEngageBtn]}
              onPress={handleToggleLike}
              activeOpacity={0.7}
            >
              <Text style={styles.engageIcon}>{article.isLiked ? '❤️' : '🤍'}</Text>
              <Text style={[styles.engageText, article.isLiked && styles.activeEngageText]}>
                {article.likesCount || 0} J'aime
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.engageBtn, article.isBookmarked && styles.activeEngageBtn]}
              onPress={handleToggleBookmark}
              activeOpacity={0.7}
            >
              <Text style={styles.engageIcon}>{article.isBookmarked ? '🔖' : '📑'}</Text>
              <Text style={[styles.engageText, article.isBookmarked && styles.activeEngageText]}>
                {article.isBookmarked ? 'Enregistré' : 'Sauvegarder'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.engageBtn} onPress={handleShare} activeOpacity={0.7}>
              <Text style={styles.engageIcon}>📤</Text>
              <Text style={styles.engageText}>Partager</Text>
            </TouchableOpacity>
          </View>

          {/* Section Commentaires */}
          {loadingComments ? (
            <ActivityIndicator size="small" color="#00d2ff" style={{ marginVertical: 20 }} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020512',
  },
  topBar: {
    height: 50,
    backgroundColor: '#020512',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#0c1228',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backBtnText: {
    color: '#00d2ff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  topActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0c1228',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topActionIcon: {
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  coverWrapper: {
    width: '100%',
    height: 240,
    position: 'relative',
    backgroundColor: '#0c1228',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    backgroundColor: 'rgba(2, 5, 18, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00d2ff',
  },
  categoryBadgeText: {
    color: '#00d2ff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  articleBody: {
    padding: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    marginBottom: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorInitial: {
    color: '#00d2ff',
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
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  verifiedIcon: {
    color: '#00d2ff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  metaText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  summaryBox: {
    backgroundColor: 'rgba(29, 104, 255, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#00d2ff',
    padding: 14,
    borderRadius: 6,
    marginBottom: 18,
  },
  summaryText: {
    color: '#93c5fd',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  contentTextWrapper: {
    marginBottom: 20,
  },
  paragraph: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
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
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
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
    color: '#00d2ff',
    fontWeight: '800',
  },
});
