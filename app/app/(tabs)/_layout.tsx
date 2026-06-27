import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Video, Search, MessageSquare, User } from 'lucide-react-native';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { useAppStore } from '../../store/useAppStore';

function TabIcon({ icon, focused }: { icon: React.ReactNode; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      {icon}
    </View>
  );
}

export default function TabLayout() {
  const friends = useAppStore(state => state.friends);
  const totalUnread = friends.reduce((acc, f) => acc + f.unread, 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'فيديو',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<Video color={color} size={22} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'بحث',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<Search color={color} size={22} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'رسائل',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <TabIcon focused={focused} icon={<MessageSquare color={color} size={22} />} />
              {totalUnread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<User color={color} size={22} />} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 24,
    marginHorizontal: 24,
    height: 72,
    borderRadius: 100,
    backgroundColor: Colors.bgDeep,
    borderTopWidth: 0,
    paddingBottom: 0,
    // Claymorphism shadow effect
    ...Platform.select({
      web: {
        boxShadow: `0px 12px 24px -8px rgba(210, 195, 180, 0.4)`,
      },
      default: {
        shadowColor: '#D0C5B9',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
      }
    }),
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  tabIcon: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 22,
    marginTop: 8,
  },
  tabIconActive: {
    backgroundColor: Colors.secondaryDim,
  },
  badge: {
    position: 'absolute', top: 6, right: -4,
    backgroundColor: Colors.primary,
    borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: Colors.bgDeep, fontSize: 10, fontWeight: '800' },
});
