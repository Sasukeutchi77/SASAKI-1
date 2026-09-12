import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Poll } from '../types';

interface PollWidgetProps {
  poll: Poll;
  onVote: (optionId: string) => Promise<void>;
}

export const PollWidget: React.FC<PollWidgetProps> = ({ poll, onVote }) => {
  const [votingId, setVotingId] = useState<string | null>(null);

  const handleVote = async (optionId: string) => {
    if (votingId || poll.userVotedOptionId) return;
    setVotingId(optionId);
    try {
      await onVote(optionId);
    } finally {
      setVotingId(null);
    }
  };

  const total = poll.totalVotes || 0;
  const hasVoted = Boolean(poll.userVotedOptionId);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.badge}>📊 SONDAGE DU DÉBAT</Text>
        <Text style={styles.totalVotes}>{total} {total > 1 ? 'votes' : 'vote'}</Text>
      </View>

      <Text style={styles.question}>{poll.question}</Text>

      <View style={styles.optionsList}>
        {poll.options.map((opt) => {
          const isSelected = poll.userVotedOptionId === opt.id;
          const percentage = total > 0 ? Math.round((opt.votesCount / total) * 100) : 0;

          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.optionItem,
                isSelected && styles.selectedOption,
                hasVoted && styles.disabledOption,
              ]}
              onPress={() => handleVote(opt.id)}
              disabled={hasVoted || Boolean(votingId)}
              activeOpacity={0.7}
            >
              {/* Barre de progression de résultat */}
              {hasVoted && (
                <View
                  style={[
                    styles.progressBar,
                    { width: `${percentage}%` },
                    isSelected && styles.selectedProgressBar,
                  ]}
                />
              )}

              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.selectedOptionText,
                  ]}
                >
                  {opt.text}
                </Text>

                {votingId === opt.id ? (
                  <ActivityIndicator size="small" color="#00d2ff" />
                ) : hasVoted ? (
                  <Text style={styles.percentageText}>{percentage}%</Text>
                ) : (
                  <View style={styles.radioCircle} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0c1228',
    borderRadius: 14,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.25)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    color: '#00d2ff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  totalVotes: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  question: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 14,
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    borderRadius: 10,
    backgroundColor: '#020512',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    position: 'relative',
    height: 44,
    justifyContent: 'center',
  },
  selectedOption: {
    borderColor: '#00d2ff',
  },
  disabledOption: {
    opacity: 0.95,
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(29, 104, 255, 0.25)',
  },
  selectedProgressBar: {
    backgroundColor: 'rgba(0, 210, 255, 0.35)',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    zIndex: 2,
  },
  optionText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  selectedOptionText: {
    color: '#00d2ff',
    fontWeight: '800',
  },
  percentageText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#64748b',
  },
});
