import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Video, Search, MessageCircle, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { StyleSheet, View, Text } from 'react-native';
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
        tabBarActiveTintColor: Colors.cyan,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => (
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />
        ),
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
              <TabIcon focused={focused} icon={<MessageCircle color={color} size={22} />} />
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
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    elevation: 0,
    backgroundColor: 'transparent',
    height: 72,
    paddingBottom: 12,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabIcon: {
    width: 40, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12,
  },
  tabIconActive: {
    backgroundColor: Colors.cyanDim,
    borderWidth: 1,
    borderColor: Colors.glassBorderBright,
  },
  badge: {
    position: 'absolute', top: -4, right: -6,
    backgroundColor: Colors.danger,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: Colors.text, fontSize: 9, fontWeight: '800' },
});
