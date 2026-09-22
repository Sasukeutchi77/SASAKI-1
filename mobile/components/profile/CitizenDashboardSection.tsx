import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Article, User } from '../../types';
import { AppIcon } from '../AppIcon';

interface CitizenDashboardSectionProps {
  currentUser: User;
  onSelectArticle?: (article: Article) => void;
  onNavigateBookmarks?: () => void;
}

export const CitizenDashboardSection: React.FC<CitizenDashboardSectionProps> = ({
  currentUser,
  onSelectArticle,
  onNavigateBookmarks,
}) => {
  const civicPercent = 78;

  const badges = [
    { id: 'b1', name: 'Sentinelle Civique', icon: 'shield' as const, color: '#06b6d4', desc: 'Alerte & vigilance citoyenne' },
    { id: 'b2', name: 'Vote Équitable', icon: 'scale' as const, color: '#10b981', desc: 'Participation aux scrutins' },
    { id: 'b3', name: 'Lecteur Vérifié', icon: 'book' as const, color: '#f59e0b', desc: 'Sources vérifiées & lues' },
  ];

  return (
    <View style={styles.container}>
      {/* Carte Statut & Niveau Civique */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.sectionTitle}>TABLEAU DE BORD CIVIQUE</Text>
            <Text style={styles.sectionSub}>Engagement & fiabilité dans l’arène PURGE</Text>
          </View>

          <View style={styles.rankPill}>
            <AppIcon name="trophy" size={11} color="#38bdf8" style={{ marginRight: 4 }} />
            <Text style={styles.rankText}>RANG CIVIQUE 3</Text>
          </View>
        </View>

        {/* Jauge de progression */}
        <View style={styles.progressBox}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>PROGRESSION VERS SENTINELLE MAJEURE</Text>
            <Text style={styles.progressPercent}>{civicPercent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${civicPercent}%` }]} />
          </View>
        </View>

        {/* Grille de 4 métriques */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricTile}>
            <AppIcon name="book" size={16} color="#06b6d4" style={{ marginBottom: 4 }} />
            <Text style={styles.metricValue}>142</Text>
            <Text style={styles.metricLabel}>Dépêches Lues</Text>
          </View>

          <View style={styles.metricTile}>
            <AppIcon name="chart" size={16} color="#10b981" style={{ marginBottom: 4 }} />
            <Text style={styles.metricValue}>28</Text>
            <Text style={styles.metricLabel}>Sondages Votés</Text>
          </View>

          <View style={styles.metricTile}>
            <AppIcon name="chatbubbles" size={16} color="#f59e0b" style={{ marginBottom: 4 }} />
            <Text style={styles.metricValue}>35</Text>
            <Text style={styles.metricLabel}>Débats Tenus</Text>
          </View>

          <View style={styles.metricTile}>
            <AppIcon name="shield-checkmark" size={16} color="#38bdf8" style={{ marginBottom: 4 }} />
            <Text style={styles.metricValue}>98%</Text>
            <Text style={styles.metricLabel}>Fiabilité</Text>
          </View>
        </View>

        {/* Badges d'honneur débloqués */}
        <View style={styles.badgesSection}>
          <Text style={styles.badgesTitle}>DISTINCTIONS CIVIQUES DÉBLOQUÉES</Text>
          <View style={styles.badgeRow}>
            {badges.map((b) => (
              <View key={b.id} style={styles.badgePillItem}>
                <AppIcon name={b.icon} size={12} color={b.color} style={{ marginRight: 5 }} />
                <View>
                  <Text style={[styles.badgeName, { color: b.color }]}>{b.name}</Text>
                  <Text style={styles.badgeDesc}>{b.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Récents Décrets & Actes */}
        <View style={styles.recentActivitySection}>
          <Text style={styles.recentTitle}>HISTORIQUE D’ACTIVITÉ RÉCENTE</Text>

          <View style={styles.activityItem}>
            <View style={styles.activityDot} />
            <View style={styles.activityBody}>
              <Text style={styles.activityText}>
                Vote enregistré sur le décret : <Text style={styles.activityHighlight}>Sanctuaires Hospitaliers</Text>
              </Text>
              <Text style={styles.activityTime}>Il y a 2 heures</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <View style={styles.activityDot} />
            <View style={styles.activityBody}>
              <Text style={styles.activityText}>
                Intervention modérée et certifiée sur : <Text style={styles.activityHighlight}>Audition Parlementaire</Text>
              </Text>
              <Text style={styles.activityTime}>Hier à 18h40</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <View style={styles.activityDot} />
            <View style={styles.activityBody}>
              <Text style={styles.activityText}>
                Badge « Sentinelle Civique » attribué pour rigueur des signalements.
              </Text>
              <Text style={styles.activityTime}>Il y a 3 jours</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#070d1e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionTitle: {
    color: '#06b6d4',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: '#06b6d4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rankText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '900',
  },
  progressBox: {
    backgroundColor: 'rgba(2, 5, 18, 0.65)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progressPercent: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '900',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#06b6d4',
    borderRadius: 3,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricTile: {
    flex: 1,
    backgroundColor: 'rgba(11, 19, 41, 0.7)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 9,
    textAlign: 'center',
    fontWeight: '600',
  },
  badgesSection: {
    gap: 8,
  },
  badgesTitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeRow: {
    gap: 8,
  },
  badgePillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 5, 18, 0.6)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '800',
  },
  badgeDesc: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 1,
  },
  recentActivitySection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
    gap: 10,
  },
  recentTitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#06b6d4',
    marginTop: 5,
  },
  activityBody: {
    flex: 1,
  },
  activityText: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
  },
  activityHighlight: {
    color: '#06b6d4',
    fontWeight: '700',
  },
  activityTime: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
});
