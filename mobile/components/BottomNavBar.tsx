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
    { id: 'feed', label: 'Dépêches', icon: '📰' },
    { id: 'search', label: 'Explorer', icon: '🔍' },
    { id: 'rankings', label: 'Top 7', icon: '🏆' },
    { id: 'bookmarks', label: 'Archives', icon: '🔖' },
    { id: 'profile', label: 'Compte', icon: '👤' },
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
            {isActive && <View style={styles.activeIndicator} />}
            <View style={styles.iconWrapper}>
              <Text style={[styles.iconText, isActive && styles.activeIconText]}>{tab.icon}</Text>
              {tab.id === 'bookmarks' && unreadBookmarks > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadBookmarks}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    height: 62,
    backgroundColor: '#020512',
    borderTopWidth: 1,
    borderTopColor: 'rgba(6, 182, 212, 0.25)',
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
    height: '100%',
  },
  activeTabBtn: {
    transform: [{ scale: 1.05 }],
  },
  iconWrapper: {
    position: 'relative',
  },
  iconText: {
    fontSize: 18,
    opacity: 0.55,
  },
  activeIconText: {
    opacity: 1,
  },
  tabLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  activeTabLabel: {
    color: '#06b6d4',
    fontWeight: '800',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 28,
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

