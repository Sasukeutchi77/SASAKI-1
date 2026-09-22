import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppIcon, AppIconName } from '../AppIcon';

export type ProfileTabKey = 'activity' | 'press' | 'security';

interface ProfileSegmentedTabsProps {
  activeTab: ProfileTabKey;
  onChangeTab: (tab: ProfileTabKey) => void;
  pendingRequestsCount?: number;
}

export const ProfileSegmentedTabs: React.FC<ProfileSegmentedTabsProps> = ({
  activeTab,
  onChangeTab,
  pendingRequestsCount = 0,
}) => {
  const tabs: { key: ProfileTabKey; label: string; icon: AppIconName; badge?: number }[] = [
    {
      key: 'activity',
      label: 'Activité & Rangs',
      icon: 'trophy',
    },
    {
      key: 'press',
      label: 'Presse & Enquêtes',
      icon: 'newspaper',
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
    },
    {
      key: 'security',
      label: 'Sécurité & Options',
      icon: 'shield',
    },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, isActive && styles.activeTabBtn]}
            onPress={() => onChangeTab(tab.key)}
            activeOpacity={0.8}
          >
            <View style={styles.tabContent}>
              <AppIcon
                name={tab.icon}
                size={13}
                color={isActive ? '#06b6d4' : '#64748b'}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab.label}
              </Text>
              {tab.badge ? (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              ) : null}
            </View>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#070d1e',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  activeTabBtn: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#06b6d4',
    fontWeight: '800',
  },
  badgePill: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 2,
    height: 2,
    width: 24,
    borderRadius: 1,
    backgroundColor: '#06b6d4',
  },
});
