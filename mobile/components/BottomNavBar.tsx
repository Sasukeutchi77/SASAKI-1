import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationTab } from '../types';
import { AppIcon, AppIconName } from './AppIcon';

interface BottomNavBarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  unreadBookmarks?: number;
  isJournalist?: boolean;
  hasHouse?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  unreadBookmarks = 0,
  isJournalist = false,
  hasHouse = false,
}) => {
  const houseLabel = isJournalist || hasHouse ? 'Ma Maison' : 'Maisons';

  const tabs: { id: NavigationTab; label: string; iconName: AppIconName }[] = [
    { id: 'feed', label: 'Actualités', iconName: 'newspaper' },
    { id: 'search', label: 'Explorer', iconName: 'explore' },
    { id: 'rankings', label: 'Top 7', iconName: 'trophy' },
    { id: 'house', label: houseLabel, iconName: 'building' },
    { id: 'bookmarks', label: 'Favoris', iconName: 'bookmark' },
    { id: 'profile', label: 'Profil', iconName: 'profile' },
  ];

  return (
    <View style={styles.navBar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const iconColor = isActive ? '#06b6d4' : '#64748b';
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBtn, isActive && styles.activeTabBtn]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
          >
            {isActive && <View style={styles.activeIndicator} />}
            <View style={styles.iconWrapper}>
              <AppIcon name={tab.iconName} size={20} color={iconColor} />
              {tab.id === 'bookmarks' && unreadBookmarks > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadBookmarks}</Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.tabLabel, isActive && styles.activeTabLabel]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    height: 64,
    backgroundColor: '#020512',
    borderTopWidth: 1,
    borderTopColor: 'rgba(6, 182, 212, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
    height: '100%',
  },
  activeTabBtn: {
    transform: [{ scale: 1.04 }],
  },
  iconWrapper: {
    position: 'relative',
  },
  iconText: {
    fontSize: 17,
    opacity: 0.6,
  },
  activeIconText: {
    opacity: 1,
  },
  tabLabel: {
    color: '#64748b',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#06b6d4',
    fontWeight: '800',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    backgroundColor: '#06b6d4',
    borderRadius: 2,
    shadowColor: '#06b6d4',
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

