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

interface CommentSectionProps {
  comments: Comment[];
  currentUser: User | null;
  onAddComment: (content: string) => Promise<void>;
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

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddComment(content.trim());
      setContent('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        Espace Débat ({comments.length})
      </Text>

      {/* Zone de saisie commentaire */}
      {currentUser ? (
        <View style={styles.inputCard}>
          <TextInput
            style={styles.textInput}
            placeholder="Partagez votre point de vue factuel..."
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
                <Text style={styles.sendBtnText}>PUBLIER</Text>
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
          <Text style={styles.loginPromptText}>
            🔒 Connectez-vous pour participer au débat citoyen
          </Text>
        </TouchableOpacity>
      )}

      {/* Liste des commentaires */}
      <View style={styles.commentsList}>
        {comments.length === 0 ? (
          <Text style={styles.emptyText}>Soyez le premier à commenter cet article.</Text>
        ) : (
          comments.map((comment) => (
            <View key={comment.id} style={styles.commentItem}>
              {comment.authorAvatar ? (
                <Image source={{ uri: comment.authorAvatar }} style={styles.commentAvatar} />
              ) : (
                <View style={styles.commentAvatarPlaceholder}>
                  <Text style={styles.commentAvatarInitial}>
                    {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.commentBody}>
                <View style={styles.authorHeader}>
                  <Text style={styles.commentAuthorName}>{comment.authorName}</Text>
                  {comment.authorIsVerified && (
                    <Text style={styles.verifiedBadge}>✓</Text>
                  )}
                  {comment.authorRole === 'journalist' && (
                    <View style={styles.journalistBadge}>
                      <Text style={styles.journalistBadgeText}>Journaliste</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.commentContent}>{comment.content}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  inputCard: {
    backgroundColor: '#0c1228',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.2)',
    marginBottom: 16,
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
    backgroundColor: '#1d68ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
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
    gap: 12,
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
    backgroundColor: '#0c1228',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
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
  commentAvatarInitial: {
    color: '#00d2ff',
    fontSize: 13,
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
  commentContent: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
});
