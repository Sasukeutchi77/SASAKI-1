import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Share,
  Alert,
} from 'react-native';
import { User } from '../../types';
import { AppIcon } from '../AppIcon';

interface ProfileHeaderCardProps {
  currentUser: User;
  onOpenEditProfile: () => void;
  onOpenAvatarPicker: () => void;
  updatingAvatar?: boolean;
}

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
  currentUser,
  onOpenEditProfile,
  onOpenAvatarPicker,
  updatingAvatar = false,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isJournalist = currentUser.role === 'journalist' || isAdmin;
  const hasMediaHouse = Boolean(currentUser.mediaId || currentUser.mediaName);

  const getRoleConfig = () => {
    if (isAdmin) {
      return {
        label: 'ADMINISTRATEUR PURGE',
        icon: 'shield' as const,
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.4)',
      };
    }
    if (currentUser.mediaHouseRole === 'Chef de Rédaction' || (isJournalist && hasMediaHouse)) {
      return {
        label: currentUser.mediaHouseRole || 'JOURNALISTE ACCRÉDITÉ',
        icon: 'newspaper' as const,
        color: '#06b6d4',
        bg: 'rgba(6, 182, 212, 0.15)',
        borderColor: 'rgba(6, 182, 212, 0.4)',
      };
    }
    if (isJournalist) {
      return {
        label: 'JOURNALISTE ACCRÉDITÉ',
        icon: 'newspaper' as const,
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.15)',
        borderColor: 'rgba(56, 189, 248, 0.4)',
      };
    }
    return {
      label: 'CITOYEN INVESTIGATEUR',
      icon: 'people' as const,
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.12)',
      borderColor: 'rgba(148, 163, 184, 0.3)',
    };
  };

  const roleConfig = getRoleConfig();

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Découvrez le profil de ${currentUser.name} sur PURGE - Journalisme factuel et libre. https://purge.info/user/${currentUser.username || currentUser.id}`,
        title: `Profil de ${currentUser.name} sur PURGE`,
      });
    } catch {
      Alert.alert('Partage', `Lien du profil copié : https://purge.info/user/${currentUser.username || currentUser.id}`);
    }
  };

  return (
    <View style={styles.card}>
      {/* Background cyber accent glow */}
      <View style={styles.cyberGlow} />

      <View style={styles.topRow}>
        {/* Avatar avec bouton photo interactif */}
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={onOpenAvatarPicker}
          activeOpacity={0.8}
        >
          {currentUser.avatar ? (
            <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'P'}
              </Text>
            </View>
          )}

          <View style={styles.cameraPill}>
            <AppIcon name="camera" size={11} color="#ffffff" />
          </View>
        </TouchableOpacity>

        {/* Détails Utilisateur */}
        <View style={styles.detailsCol}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {currentUser.name || 'Citoyen Anonyme'}
            </Text>
            {(currentUser.isVerified || isAdmin || isJournalist) && (
              <View style={styles.verifiedBadge}>
                <AppIcon name="shield-checkmark" size={14} color="#06b6d4" />
              </View>
            )}
          </View>

          <Text style={styles.userEmail} numberOfLines={1}>
            {currentUser.username ? `@${currentUser.username}` : currentUser.email}
          </Text>

          {/* Badge de Rôle */}
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: roleConfig.bg, borderColor: roleConfig.borderColor },
            ]}
          >
            <AppIcon name={roleConfig.icon} size={11} color={roleConfig.color} style={{ marginRight: 4 }} />
            <Text style={[styles.roleBadgeText, { color: roleConfig.color }]}>
              {roleConfig.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Bio / Devise */}
      <Text style={styles.bioText} numberOfLines={3}>
        {currentUser.bio && currentUser.bio.trim()
          ? currentUser.bio
          : 'Membre actif de la communauté PURGE. Observateur factuel et défenseur du droit à une information transparente.'}
      </Text>

      {/* Compteurs statistiques d'impact */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {isJournalist ? '24' : '98%'}
          </Text>
          <Text style={styles.statLabel}>
            {isJournalist ? 'Enquêtes' : 'Score Fiabilité'}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {currentUser.mediaName ? 'Affilié' : 'Citoyen'}
          </Text>
          <Text style={styles.statLabel}>
            {currentUser.mediaName ? currentUser.mediaName : 'Statut Réseau'}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {isAdmin ? 'Maître' : isJournalist ? 'Certifié' : 'Niveau 3'}
          </Text>
          <Text style={styles.statLabel}>Rang Civique</Text>
        </View>
      </View>

      {/* Barre d'actions rapides */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={onOpenEditProfile}
          activeOpacity={0.8}
        >
          <AppIcon name="pencil" size={13} color="#06b6d4" style={{ marginRight: 6 }} />
          <Text style={styles.editBtnText}>Modifier profil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShareProfile}
          activeOpacity={0.8}
        >
          <AppIcon name="share-social" size={13} color="#cbd5e1" style={{ marginRight: 6 }} />
          <Text style={styles.shareBtnText}>Partager</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#070d1e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  cyberGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#06b6d4',
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0c1a38',
    borderWidth: 2,
    borderColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#06b6d4',
    fontSize: 28,
    fontWeight: '900',
  },
  cameraPill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0891b2',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#070d1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  verifiedBadge: {
    marginLeft: 2,
  },
  userEmail: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bioText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(2, 5, 18, 0.75)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignSelf: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: '#06b6d4',
    paddingVertical: 9,
    borderRadius: 8,
  },
  editBtnText: {
    color: '#06b6d4',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1329',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 9,
    borderRadius: 8,
  },
  shareBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
});
