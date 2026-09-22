import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Comment, User } from '../types';
import { AppIcon } from './AppIcon';

interface CommentSectionProps {
  comments: Comment[];
  currentUser: User | null;
  onAddComment: (content: string, parentId?: string) => Promise<void>;
  onOpenAuth?: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  comments,
  currentUser,
  onAddComment,
  onOpenAuth,
}) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<Record<string, boolean>>({});

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddComment(content.trim(), replyingTo?.id);
      setContent('');
      setReplyingTo(null);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLikeComment = (commentId: string) => {
    setLikedCommentIds((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  // Séparation en commentaires racines et réponses hiérarchiques
  const safeComments = comments || [];
  const rootComments = safeComments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) => safeComments.filter((c) => c.parentId === parentId);

  const renderCommentItem = (comment: Comment, isReply = false) => {
    const isLiked = Boolean(likedCommentIds[comment.id] || comment.isLiked);
    const likesCount = (comment.likesCount || 0) + (likedCommentIds[comment.id] && !comment.isLiked ? 1 : 0);

    return (
      <View
        key={comment.id}
        style={[styles.commentItem, isReply && styles.replyCommentItem]}
      >
        {comment.authorAvatar ? (
          <Image
            source={{ uri: comment.authorAvatar }}
            style={[styles.commentAvatar, isReply && styles.replyAvatar]}
          />
        ) : (
          <View
            style={[
              styles.commentAvatarPlaceholder,
              isReply && styles.replyAvatarPlaceholder,
            ]}
          >
            <Text style={styles.commentAvatarInitial}>
              {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
        )}
        <View style={styles.commentBody}>
          <View style={styles.authorHeader}>
            <Text style={styles.commentAuthorName}>{comment.authorName}</Text>
            {comment.authorIsVerified && (
              <AppIcon name="checkmark-circle" size={12} color="#00d2ff" style={{ marginHorizontal: 2 }} />
            )}
            {comment.authorRole === 'journalist' && (
              <View style={styles.journalistBadge}>
                <Text style={styles.journalistBadgeText}>Journaliste</Text>
              </View>
            )}
            <Text style={styles.commentTime}>
              {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Récent'}
            </Text>
          </View>

          <Text style={styles.commentContent}>{comment.content}</Text>

          {/* Actions : Répondre & Soutenir */}
          <View style={styles.commentActionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => toggleLikeComment(comment.id)}
              activeOpacity={0.7}
            >
              <AppIcon name={isLiked ? 'heart' : 'heart-outline'} size={13} color={isLiked ? '#ef4444' : '#94a3b8'} />
              <Text style={[styles.actionLabel, isLiked && styles.activeActionLabel]}>
                {likesCount > 0 ? likesCount : 'Soutenir'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setReplyingTo({ id: comment.id, authorName: comment.authorName });
              }}
              activeOpacity={0.7}
            >
              <AppIcon name="arrow-undo" size={13} color="#94a3b8" />
              <Text style={styles.actionLabel}>Répondre</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>
          Espace Débat & Confrérie ({comments.length})
        </Text>
        <Text style={styles.sectionSub}>Débats modérés & sourcés</Text>
      </View>

      {/* Zone de saisie commentaire */}
      {currentUser ? (
        <View style={styles.inputCard}>
          {replyingTo && (
            <View style={styles.replyingToBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="arrow-undo" size={12} color="#94a3b8" style={{ marginRight: 4 }} />
                <Text style={styles.replyingToText}>
                  En réponse à <Text style={styles.replyingToAuthor}>@{replyingTo.authorName}</Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                style={styles.cancelReplyBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.cancelReplyText}>Annuler </Text>
                  <AppIcon name="close" size={12} color="#ef4444" />
                </View>
              </TouchableOpacity>
            </View>
          )}

          <TextInput
            style={styles.textInput}
            placeholder={
              replyingTo
                ? `Répondre à @${replyingTo.authorName}...`
                : 'Partagez votre point de vue factuel...'
            }
            placeholderTextColor="#64748b"
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={500}
          />
          <View style={styles.inputFooter}>
            <Text style={styles.charCount}>{content.length}/500</Text>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!content.trim() || submitting) && styles.sendBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!content.trim() || submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.sendBtnText}>
                  {replyingTo ? 'RÉPONDRE' : 'PUBLIER'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.loginPrompt}
          onPress={onOpenAuth}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon name="lock" size={14} color="#00d2ff" style={{ marginRight: 6 }} />
            <Text style={styles.loginPromptText}>
              Connectez-vous pour participer au débat citoyen
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Liste hiérarchique des commentaires */}
      <View style={styles.commentsList}>
        {comments.length === 0 ? (
          <Text style={styles.emptyText}>Soyez le premier à commenter cette enquête.</Text>
        ) : (
          rootComments.map((root) => {
            const replies = getReplies(root.id);
            return (
              <View key={root.id} style={styles.threadContainer}>
                {renderCommentItem(root, false)}

                {/* Réponses imbriquées */}
                {replies.length > 0 && (
                  <View style={styles.repliesWrapper}>
                    <View style={styles.threadGuideLine} />
                    <View style={styles.repliesList}>
                      {replies.map((reply) => renderCommentItem(reply, true))}
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSub: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  inputCard: {
    backgroundColor: '#0c1228',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.25)',
    marginBottom: 16,
  },
  replyingToBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  replyingToText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  replyingToAuthor: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  cancelReplyBtn: {
    padding: 2,
  },
  cancelReplyText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  textInput: {
    color: '#ffffff',
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  charCount: {
    color: '#64748b',
    fontSize: 11,
  },
  sendBtn: {
    backgroundColor: '#00d2ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#020512',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  loginPrompt: {
    backgroundColor: '#0c1228',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  loginPromptText: {
    color: '#00d2ff',
    fontSize: 13,
    fontWeight: '600',
  },
  commentsList: {
    gap: 14,
  },
  threadContainer: {
    marginBottom: 4,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  commentItem: {
    flexDirection: 'row',
    backgroundColor: '#081028',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  replyCommentItem: {
    backgroundColor: '#060c20',
    borderColor: 'rgba(6, 182, 212, 0.15)',
    padding: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  replyAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 8,
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  replyAvatarPlaceholder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1e293b',
    marginRight: 8,
  },
  commentAvatarInitial: {
    color: '#00d2ff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentBody: {
    flex: 1,
  },
  authorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
    flexWrap: 'wrap',
  },
  commentAuthorName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  verifiedBadge: {
    color: '#00d2ff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  journalistBadge: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  journalistBadgeText: {
    color: '#00d2ff',
    fontSize: 9,
    fontWeight: '700',
  },
  commentTime: {
    color: '#64748b',
    fontSize: 10,
    marginLeft: 'auto',
  },
  commentContent: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
  },
  commentActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  actionEmoji: {
    fontSize: 12,
  },
  actionLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  activeActionLabel: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  repliesWrapper: {
    flexDirection: 'row',
    marginLeft: 18,
    marginTop: 8,
  },
  threadGuideLine: {
    width: 2,
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
    marginRight: 10,
    borderRadius: 1,
  },
  repliesList: {
    flex: 1,
    gap: 8,
  },
});

