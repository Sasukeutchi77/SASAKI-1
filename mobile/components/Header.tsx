import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { User, isJournalistRole, isAdminRole } from '../types';
import { AppIcon } from './AppIcon';

interface HeaderProps {
  title?: string;
  user?: User | null;
  onOpenCreateArticle?: () => void;
  onOpenSearch?: () => void;
  onOpenProfile?: () => void;
  onOpenNotifications?: () => void;
  onOpenTrustSystem?: () => void;
  unreadNotificationsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  user,
  onOpenCreateArticle,
  onOpenSearch,
  onOpenProfile,
  onOpenNotifications,
  onOpenTrustSystem,
  unreadNotificationsCount = 0,
}) => {
  const canPublish = user && (isJournalistRole(user.role) || isAdminRole(user.role));

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.leftGroup}
        onPress={onOpenTrustSystem}
        activeOpacity={0.8}
      >
        <Image
          source={require('../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.logoText}>
              purge<Text style={styles.logoTextCyan}>-info</Text>
            </Text>
            <View style={styles.sorsaBadge}>
              <Text style={styles.sorsaBadgeText}>Sorsa Tech</Text>
            </View>
          </View>
          <View style={styles.devRow}>
            <Text style={styles.devLabel}>DEV: </Text>
            <Text style={styles.devCompany}>SASAKI-COMPAGNIE</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.rightGroup}>
        {onOpenTrustSystem && (
          <TouchableOpacity
            style={styles.trustShieldBtn}
            onPress={onOpenTrustSystem}
            activeOpacity={0.7}
            accessibilityLabel="Système de Confiance & Charte"
          >
            <AppIcon name="shield" size={16} color="#00d2ff" />
          </TouchableOpacity>
        )}

        {onOpenNotifications && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onOpenNotifications}
            activeOpacity={0.7}
          >
            <AppIcon name="bell" size={16} color="#cbd5e1" />
            {unreadNotificationsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {onOpenSearch && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onOpenSearch}
            activeOpacity={0.7}
          >
            <AppIcon name="search" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        )}

        {onOpenProfile && (
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={onOpenProfile}
            activeOpacity={0.8}
          >
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                {user?.name ? (
                  <Text style={styles.avatarInitial}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                ) : (
                  <AppIcon name="profile" size={16} color="#00d2ff" />
                )}
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 60,
    backgroundColor: '#020512',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoTextCyan: {
    color: '#00d2ff',
  },
  sorsaBadge: {
    backgroundColor: 'rgba(29, 104, 255, 0.2)',
    borderColor: 'rgba(0, 210, 255, 0.4)',
    borderWidth: 0.8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  sorsaBadgeText: {
    color: '#00d2ff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  devLabel: {
    color: 'rgba(147, 197, 253, 0.6)',
    fontSize: 8.5,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  devCompany: {
    color: '#00d2ff',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.3,
    fontFamily: 'monospace',
  },
  trustShieldBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustShieldIcon: {
    fontSize: 14,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0b1329',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 15,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#020512',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  searchIcon: {
    fontSize: 14,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#06b6d4',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0b1329',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#06b6d4',
    fontSize: 14,
    fontWeight: '700',
  },
});
