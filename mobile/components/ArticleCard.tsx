import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Article } from '../types';

interface ArticleCardProps {
  article: Article;
  onPress: () => void;
  onToggleLike?: () => void;
  onToggleBookmark?: () => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onPress,
  onToggleLike,
  onToggleBookmark,
}) => {
  const defaultCover =
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80';
  const coverUri = article.coverImage || article.coverMedia?.url || defaultCover;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Image de couverture avec Badge Catégorie */}
      <View style={styles.imageWrapper}>
        <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
        <View style={styles.badgeContainer}>
          {article.categoryName && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{article.categoryName}</Text>
            </View>
          )}
          {article.readTime && (
            <View style={styles.readTimeBadge}>
              <Text style={styles.readTimeText}>⏱ {article.readTime} min</Text>
            </View>
          )}
        </View>
      </View>

      {/* Contenu Texte */}
      <View style={styles.contentWrapper}>
        <Text style={styles.title} numberOfLines={2}>
          {article.title}
        </Text>

        {article.summary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {article.summary}
          </Text>
        ) : null}

        {/* Ligne Auteur */}
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
              <Text style={styles.authorName} numberOfLines={1}>
                {article.authorName}
              </Text>
              {article.authorIsVerified && <Text style={styles.verifiedIcon}> ✓</Text>}
            </View>
            <Text style={styles.mediaHouseName} numberOfLines={1}>
              {article.mediaName || 'PURGE Rédaction'}
            </Text>
          </View>
        </View>

        {/* Barre d'interaction sociale */}
        <View style={styles.footerRow}>
          <View style={styles.leftMetrics}>
            <TouchableOpacity
              style={styles.metricBtn}
              onPress={onToggleLike}
              activeOpacity={0.7}
            >
              <Text style={styles.metricIcon}>{article.isLiked ? '❤️' : '🤍'}</Text>
              <Text style={[styles.metricCount, article.isLiked && styles.activeMetric]}>
                {article.likesCount || 0}
              </Text>
            </TouchableOpacity>

            <View style={styles.metricBtn}>
              <Text style={styles.metricIcon}>💬</Text>
              <Text style={styles.metricCount}>{article.commentsCount || 0}</Text>
            </View>

            <View style={styles.metricBtn}>
              <Text style={styles.metricIcon}>👁️</Text>
              <Text style={styles.metricCount}>{article.viewsCount || 0}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.bookmarkBtn}
            onPress={onToggleBookmark}
            activeOpacity={0.7}
          >
            <Text style={styles.bookmarkIcon}>{article.isBookmarked ? '🔖' : '📑'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0c1228',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  imageWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#020512',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: 'rgba(2, 5, 18, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00d2ff',
  },
  categoryBadgeText: {
    color: '#00d2ff',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readTimeBadge: {
    backgroundColor: 'rgba(2, 5, 18, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  readTimeText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  contentWrapper: {
    padding: 14,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 6,
  },
  summary: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 4,
  },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  authorPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  authorInitial: {
    color: '#00d2ff',
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '700',
  },
  verifiedIcon: {
    color: '#00d2ff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mediaHouseName: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  leftMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricIcon: {
    fontSize: 13,
  },
  metricCount: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  activeMetric: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  bookmarkBtn: {
    padding: 4,
  },
  bookmarkIcon: {
    fontSize: 15,
  },
});
