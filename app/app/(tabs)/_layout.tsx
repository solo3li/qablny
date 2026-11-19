import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Home, MessageSquare, User, Video, Radio, Compass } from 'lucide-react-native';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';

function TabIcon({ icon, focused }: { icon: React.ReactNode; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      {icon}
      {focused && <View style={styles.microDot} />}
    </View>
  );
}

export default function TabLayout() {
  const friends = useAppStore(state => state.friends);
  const isMatchMode = useAppStore(state => state.isMatchMode);
  const totalUnread = friends.reduce((acc, f) => acc + f.unread, 0);
  const insets = useSafeAreaInsets();

  const bottomPadding = Math.max(Platform.OS === 'ios' ? 24 : 10, insets.bottom || 0);
  const barHeight = Platform.OS === 'ios' ? Math.max(80, 56 + bottomPadding) : Math.max(64, 54 + bottomPadding);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: barHeight,
            paddingBottom: bottomPadding,
          },
          Platform.OS === 'web' ? ({
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.04)',
          } as any) : null,
          isMatchMode ? { display: 'none' } : undefined,
        ],
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#FE3C72',
        tabBarInactiveTintColor: '#8E8E93',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<Home color={color} size={22} strokeWidth={focused ? 2.5 : 2} />} />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: 'القريبين',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<Compass color={color} size={22} strokeWidth={focused ? 2.5 : 2} />} />
          ),
        }}
      />

      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Voice',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<Radio color={color} size={22} strokeWidth={focused ? 2.5 : 2} />} />
          ),
        }}
      />

      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<Video color={color} size={22} strokeWidth={focused ? 2.5 : 2} />} />
          ),
        }}
      />

      <Tabs.Screen
        name="wallet"
        options={{
          href: null, // hide from tab bar but keep route
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ position: 'relative' }}>
              <TabIcon focused={focused} icon={<MessageSquare color={color} size={22} strokeWidth={focused ? 2.5 : 2} />} />
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
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<User color={color} size={22} strokeWidth={focused ? 2.5 : 2} />} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    paddingTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    elevation: 8,
    ...Platform.select({
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
    }),
  },
  tabIcon: {
    alignItems: 'center', 
    justifyContent: 'center',
    width: 44,
    height: 38,
    position: 'relative',
  },
  microDot: {
    position: 'absolute',
    bottom: 2,
    alignSelf: 'center',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FE3C72',
  },
  badge: {
    position: 'absolute', 
    top: -2, 
    right: 0,
    backgroundColor: Colors.danger,
    borderRadius: 10, 
    minWidth: 18, 
    height: 18,
    alignItems: 'center', 
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
