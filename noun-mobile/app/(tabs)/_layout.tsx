import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';

const tabs = [
  { name: '/', label: 'Home', icon: '🏠' },
  { name: '/dashboard', label: 'Dashboard', icon: '📊' },
  { name: '/leaderboard', label: 'Ranks', icon: '🏆' },
  { name: '/news', label: 'News', icon: '📰' },
  { name: '/buddies', label: 'Buddies', icon: '👥' },
  { name: '/profile', label: 'Profile', icon: '👤' },
];

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();
  usePushNotifications(); // Activate push notifications

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Slot />
      <View style={[styles.tabBar, { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder }]}>
        {tabs.map(tab => {
          const isActive = pathname === tab.name || (tab.name === '/' && pathname === '/');
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => router.push(tab.name as any)}
            >
              <Text style={{ fontSize: 22 }}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, { color: isActive ? colors.tabActive : colors.tabInactive }]}>
                {tab.label}
              </Text>
              {isActive && <View style={[styles.indicator, { backgroundColor: colors.tabActive }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  indicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    marginTop: 3,
  },
});
