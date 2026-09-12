import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { User, isJournalistRole, isAdminRole } from '../types';

interface HeaderProps {
  title?: string;
  user?: User | null;
  onOpenCreateArticle?: () => void;
  onOpenSearch?: () => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  user,
  onOpenCreateArticle,
  onOpenSearch,
  onOpenProfile,
}) => {
  const canPublish = user && (isJournalistRole(user.role) || isAdminRole(user.role));

  return (
    <View style={styles.header}>
      <View style={styles.leftGroup}>
        <Image
          source={require('../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View>
          <Text style={styles.logoText}>
            PURGE <Text style={styles.accentText}>• LIVE</Text>
          </Text>
          {title && <Text style={styles.subTitle}>{title}</Text>}
        </View>
      </View>

      <View style={styles.rightGroup}>
        {canPublish && onOpenCreateArticle && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onOpenCreateArticle}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>+ ÉCRIRE</Text>
          </TouchableOpacity>
        )}

        {onOpenSearch && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onOpenSearch}
            activeOpacity={0.7}
          >
            <Text style={styles.searchIcon}>🔍</Text>
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
                <Text style={styles.avatarInitial}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : '👤'}
                </Text>
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
    height: 56,
    backgroundColor: '#020512',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 210, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 10,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  accentText: {
    color: '#00d2ff',
    fontSize: 12,
    fontWeight: '800',
  },
  subTitle: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: '#1d68ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00d2ff',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0c1228',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    fontSize: 14,
  },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#00d2ff',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0c1228',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#00d2ff',
    fontSize: 13,
    fontWeight: '700',
  },
});
