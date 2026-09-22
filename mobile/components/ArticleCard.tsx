import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Article } from '../types';
import { AppIcon } from './AppIcon';

interface ArticleCardProps {
  article: Article;
  onPress: () => void;
  onToggleLike?: () => void;
  onToggleBookmark?: () => void;
  onPressHouse?: (houseName: string, houseId?: string) => void;
  highlightQuery?: string;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onPress,
  onToggleLike,
  onToggleBookmark,
  onPressHouse,
  highlightQuery,
}) => {
  const defaultCover =
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80';
  const coverUri = article.coverImage || article.coverMedia?.url || defaultCover;
  const trustScore = article.trustScore || 96;

  const renderHighlightedText = (text: string, query?: string, isTitle = false) => {
    const q = query?.trim();
    if (!q || !text) {
      return (
        <Text style={isTitle ? styles.title : styles.summary} numberOfLines={2}>
          {text}
        </Text>
      );
    }
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return (
      <Text style={isTitle ? styles.title : styles.summary} numberOfLines={2}>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <Text
              key={index}
              style={[
                isTitle ? styles.title : styles.summary,
                styles.highlightedChunk,
              ]}
            >
              {part}
            </Text>
          ) : (
            <Text key={index}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Image de couverture avec Badge Catégorie & Fiabilité */}
      <View style={styles.imageWrapper}>
        <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
        <View style={styles.topBadgesRow}>
          <View style={styles.badgeLeft}>
            {article.categoryName && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{article.categoryName}</Text>
              </View>
            )}
          </View>
          <View style={styles.trustBadge}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppIcon name="star" size={11} color="#eab308" style={{ marginRight: 3 }} />
              <Text style={styles.trustBadgeText}>{trustScore}% FIABILITÉ</Text>
            </View>
          </View>
        </View>

        <View style={styles.pillsRow}>
          {article.poll && (
            <View style={styles.featurePill}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="chart" size={11} color="#00d2ff" style={{ marginRight: 3 }} />
                <Text style={styles.featurePillText}>Sondage</Text>
              </View>
            </View>
          )}
          {article.readTime && (
            <View style={styles.readTimePill}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="calendar" size={11} color="#94a3b8" style={{ marginRight: 3 }} />
                <Text style={styles.readTimeText}>{article.readTime} min</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Contenu Texte */}
      <View style={styles.contentWrapper}>
        {renderHighlightedText(article.title, highlightQuery, true)}

        {article.summary
          ? renderHighlightedText(article.summary, highlightQuery, false)
          : null}

        {/* Tags thématiques */}
        {article.tags && article.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {article.tags.slice(0, 3).map((t, idx) => (
              <Text key={idx} style={styles.tagText}>
                #{t.replace(/^#/, '')}
              </Text>
            ))}
          </View>
        )}

        {/* Ligne Auteur & Maison de Presse */}
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
              {article.authorIsVerified && (
                <AppIcon name="checkmark-circle" size={13} color="#00d2ff" style={{ marginLeft: 4 }} />
              )}
            </View>
            <TouchableOpacity
              onPress={() => onPressHouse && onPressHouse(article.mediaName || '', article.mediaId)}
              disabled={!onPressHouse}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="building" size={11} color="#00d2ff" style={{ marginRight: 4 }} />
                <Text style={styles.mediaHouseName} numberOfLines={1}>
                  {article.mediaName || 'PURGE Rédaction Centrale'}
                </Text>
              </View>
            </TouchableOpacity>
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
              <AppIcon
                name="heart"
                size={14}
                color={article.isLiked ? '#ef4444' : '#64748b'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.metricCount, article.isLiked && styles.activeMetric]}>
                {article.likesCount || 0}
              </Text>
            </TouchableOpacity>

            <View style={styles.metricBtn}>
              <AppIcon name="comment" size={14} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.metricCount}>{article.commentsCount || 0}</Text>
            </View>

            <View style={styles.metricBtn}>
              <AppIcon name="eye" size={14} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.metricCount}>{article.viewsCount || 0}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.bookmarkBtn}
            onPress={onToggleBookmark}
            activeOpacity={0.7}
          >
            <AppIcon
              name="bookmark"
              size={16}
              color={article.isBookmarked ? '#00d2ff' : '#64748b'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#081028',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  imageWrapper: {
    width: '100%',
    height: 190,
    position: 'relative',
    backgroundColor: '#020512',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  topBadgesRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeLeft: {
    flexDirection: 'row',
  },
  categoryBadge: {
    backgroundColor: 'rgba(2, 5, 18, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  categoryBadgeText: {
    color: '#06b6d4',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trustBadge: {
    backgroundColor: 'rgba(2, 5, 18, 0.88)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trustBadgeText: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  pillsRow: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    gap: 6,
  },
  featurePill: {
    backgroundColor: 'rgba(29, 104, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.4)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featurePillText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '700',
  },
  readTimePill: {
    backgroundColor: 'rgba(2, 5, 18, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 6,
  },
  summary: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  highlightedChunk: {
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
    color: '#38bdf8',
    fontWeight: '900',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  tagText: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '600',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 4,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  authorPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0c1a3b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  authorInitial: {
    color: '#06b6d4',
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
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  verifiedIcon: {
    color: '#06b6d4',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mediaHouseName: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
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

