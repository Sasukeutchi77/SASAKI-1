import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationTab } from '../types';

interface BottomNavBarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  unreadBookmarks?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  unreadBookmarks = 0,
}) => {
  const tabs: { id: NavigationTab; label: string; icon: string }[] = [
    { id: 'feed', label: 'Actualités', icon: '📰' },
    { id: 'search', label: 'Explorer', icon: '🔍' },
    { id: 'rankings', label: 'Top 7', icon: '🏆' },
    { id: 'bookmarks', label: 'Favoris', icon: '🔖' },
    { id: 'profile', label: 'Profil', icon: '👤' },
  ];

  return (
    <View style={styles.navBar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBtn, isActive && styles.activeTabBtn]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Text style={[styles.iconText, isActive && styles.activeIconText]}>{tab.icon}</Text>
              {tab.id === 'bookmarks' && unreadBookmarks > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadBookmarks}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{tab.label}</Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    height: 60,
    backgroundColor: '#020512',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 210, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  activeTabBtn: {
    transform: [{ scale: 1.05 }],
  },
  iconWrapper: {
    position: 'relative',
  },
  iconText: {
    fontSize: 18,
    opacity: 0.6,
  },
  activeIconText: {
    opacity: 1,
  },
  tabLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  activeTabLabel: {
    color: '#00d2ff',
    fontWeight: '800',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 2.5,
    backgroundColor: '#00d2ff',
    borderRadius: 2,
    shadowColor: '#00d2ff',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
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
