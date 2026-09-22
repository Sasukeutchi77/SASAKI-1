import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { AppIcon } from '../AppIcon';

interface HouseLivePreviewCardProps {
  name: string;
  motto: string;
  logo: string;
  coverImage: string;
  specialties: string[];
  ownerName: string;
  address?: string;
}

export const HouseLivePreviewCard: React.FC<HouseLivePreviewCardProps> = ({
  name,
  motto,
  logo,
  coverImage,
  specialties,
  ownerName,
  address,
}) => {
  const displayName = name.trim() || 'Votre Maison de Presse';
  const displayMotto = motto.trim() || 'L’information vérifiée, sans concession.';

  return (
    <View style={styles.card}>
      {/* Badge Aperçu en direct */}
      <View style={styles.liveBadgeRow}>
        <View style={styles.pulseDot} />
        <Text style={styles.liveBadgeText}>APERÇU DE LA CARTE EN DIRECT</Text>
      </View>

      {/* Couverture avec gradient simulé */}
      <View style={styles.coverWrapper}>
        <Image
          source={{ uri: coverImage }}
          style={styles.coverImage}
          resizeMode="cover"
        />
        <View style={styles.coverOverlay} />
        <View style={styles.pressSeal}>
          <AppIcon name="shield-checkmark" size={12} color="#06b6d4" style={{ marginRight: 4 }} />
          <Text style={styles.pressSealText}>LABEL PRESSE PURGE</Text>
        </View>
      </View>

      {/* Contenu principal avec logo chevauchant */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.logoWrapper}>
            <Image source={{ uri: logo }} style={styles.logo} resizeMode="cover" />
          </View>
          <View style={styles.metaInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.houseName} numberOfLines={1}>
                {displayName}
              </Text>
              <AppIcon name="checkmark-circle" size={15} color="#06b6d4" style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.motto} numberOfLines={2}>
              « {displayMotto} »
            </Text>
          </View>
        </View>

        {/* Domaines d'investigation */}
        {specialties.length > 0 && (
          <View style={styles.tagsRow}>
            {specialties.slice(0, 3).map((spec) => (
              <View key={spec} style={styles.tagPill}>
                <Text style={styles.tagText}>{spec}</Text>
              </View>
            ))}
            {specialties.length > 3 && (
              <View style={styles.tagPillMore}>
                <Text style={styles.tagTextMore}>+{specialties.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {/* Ligne Chef de Rédaction & Métriques */}
        <View style={styles.footerRow}>
          <View style={styles.founderWrap}>
            <AppIcon name="create" size={12} color="#06b6d4" style={{ marginRight: 5 }} />
            <Text style={styles.founderLabel}>Chef de Rédaction : </Text>
            <Text style={styles.founderName} numberOfLines={1}>
              {ownerName || 'Fondateur'}
            </Text>
          </View>

          <View style={styles.statsBadge}>
            <Text style={styles.statsText}>1 Journaliste • Initial 95%</Text>
          </View>
        </View>

        {address ? (
          <View style={styles.addressRow}>
            <AppIcon name="building" size={11} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={styles.addressText} numberOfLines={1}>
              {address}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#070d1e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020512',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#06b6d4',
    marginRight: 6,
  },
  liveBadgeText: {
    color: '#06b6d4',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  coverWrapper: {
    width: '100%',
    height: 105,
    position: 'relative',
    backgroundColor: '#0b1329',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 5, 18, 0.4)',
  },
  pressSeal: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 5, 18, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pressSealText: {
    color: '#06b6d4',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  content: {
    padding: 12,
    paddingTop: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: -22,
    marginBottom: 10,
  },
  logoWrapper: {
    width: 54,
    height: 54,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#06b6d4',
    backgroundColor: '#020512',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  metaInfo: {
    flex: 1,
    marginLeft: 10,
    marginTop: 24,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  houseName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    flexShrink: 1,
  },
  motto: {
    color: '#94a3b8',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
    lineHeight: 15,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tagPill: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: '700',
  },
  tagPillMore: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagTextMore: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  founderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  founderLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  founderName: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '800',
    flexShrink: 1,
  },
  statsBadge: {
    backgroundColor: '#0b1329',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statsText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  addressText: {
    color: '#64748b',
    fontSize: 10,
  },
});
